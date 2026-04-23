# Admin: Edit Existing Games

**Date:** 2026-04-23
**Status:** Approved (design); implementation plan pending

## Context

Admins currently have no way to fix mistakes in a game after it has been entered through the `AddGameForm` flow. Any error — wrong clue text, wrong player on a guess, wrong clue heard, missing sponsor, incorrect jackpot amount — requires a database edit by hand. We need a first-class admin UI to edit any field of an existing game while keeping the integrity of the deeply nested item / clue / guess relationships intact.

This is the editing counterpart to the create flow. Auth is intentionally out of scope; this feature inherits the same access posture as the rest of `/admin/*`.

## Goal

Provide a single edit page per game that mirrors the create form, lets admins change anything from header info down to individual guesses, and saves atomically so the game's data graph is never left in a partial state.

## Approach

A **full-form edit page** that reuses `AddGameForm` in an "edit" mode, backed by a new `updateGame` server action that performs an atomic **delete-and-recreate** of all child rows inside one Drizzle transaction.

This was chosen over (a) granular per-field inline editing on the game detail page and (b) sectioned edit sub-pages because the data is deeply nested, the existing Zod validation rules cross-reference items/clues/guesses (e.g., "exactly one correct guess per item"), and the create form is already a battle-tested place to express those constraints.

A diff-and-reconcile update strategy was rejected because no table outside a game's own subgraph references `gameItems.id` / `gameItemClues.id` / `gameItemGuesses.id`, so internal IDs are not load-bearing. Replace-in-transaction gives us near-perfect reuse of `addGame`'s insert logic.

## Architecture

### Route

New server-component page at:

```
src/app/admin/games/[id]/edit/page.tsx
```

Loads `getGameById(id)` and `getGameFormOptions()` in parallel. If the game is not found, returns `notFound()`. Otherwise transforms the loaded game into the form's `FormValues` shape via a new helper and renders `<AddGameForm mode="edit" gameId={id} defaultValues={...} formOptions={...} />`.

### Entry point

Add an "Edit" link to each row of the games table in `src/app/admin/games/page.tsx`, pointing at `/admin/games/{id}/edit`.

No edit link on the public `/games/[id]` page yet — that is gated on auth being implemented first.

### Form component changes (`src/components/AddGameForm.tsx`)

New optional props:

- `mode?: 'create' | 'edit'` (default `'create'`)
- `gameId?: number` (required when `mode === 'edit'`)
- `defaultValues?: FormValues` (passed through to `useForm`'s `defaultValues`)

Behavioural differences in edit mode:

- Submit handler calls `updateGame(gameId, data)` instead of `addGame(data)`
- Submit button label: "Save Changes" instead of "Add Game"
- A "Cancel" button is shown next to "Save"; clicking it `router.push`es to `/admin/games`
- A `useEffect` registers a `beforeunload` handler while `formState.isDirty` is true so the browser warns on navigation away with unsaved changes

All field arrays, `useWatch` / `useEffect` reactivity, the Zod schema, and the rendered fields are unchanged.

### `gameToFormValues(game)` transform

A pure function (lives in `src/lib/gameToFormValues.ts`) that converts the `getGameById` return shape into the form's `FormValues` shape:

- Inverts the toggles the form uses: `isCompleted` → `isNotCompleted`, `isCorrect` → `isIncorrect`
- Maps `itemNumber` to array index (the form addresses items positionally)
- Flattens player-sponsor pairs back into the form's nested array shape
- Sets `includePrize` / `includeJackpot` / `includeSponsors` from the presence of the related records
- Formats `gameDate` (integer ms) into the date string the form's input expects
- Maps `initialsCombination` (and the optional jackpot caller initials combination) back to the 2-char strings the form expects

### Shared insert helper

Extract the child-insert block currently inside `addGame`'s transaction (the section that creates `gameGameTypes`, `gamePlayers`, `gamePrizes`, `playerPrizeBeneficiaries`, `jackpots`, `gameSponsors`, `gamePlayerSponsors`, and the items / clues / guesses) into a private helper:

```ts
async function insertGameChildren(
  tx: Transaction,
  gameId: number,
  data: AddGameInput,
  initialCombinationId: number,
  callerInitialsCombinationId: number | null,
): Promise<void>
```

Both `addGame` and `updateGame` call it. This keeps the special-case logic (e.g. correct guesses always linking to the *last* clue ID for an item) in exactly one place.

### `updateGame` server action

New export in `src/app/actions.ts`:

```ts
export async function updateGame(
  gameId: number,
  data: AddGameInput,
): Promise<{ success: true } | { success: false; error: string }>
```

Behaviour:

1. Validate `data` against `addGameSchema` (the same schema `addGame` uses).
2. Resolve the game's `initialCombinationId` via `findOrCreateInitialCombinationId` and the optional jackpot caller initials combination the same way.
3. Open a Drizzle transaction:
   1. **UPDATE** the `games` row: `gameNumber`, `gameDate`, `hostParticipantId`, `initialCombinationId`, `locationId`, `notes`.
   2. **DELETE** all child rows for this `gameId`, in FK-safe order:
      - `gameItemGuesses` (via `gameItemId IN (SELECT id FROM gameItems WHERE gameId = ?)`)
      - `gameItemClues` (same)
      - `gameItems`
      - `playerPrizeBeneficiaries` (via `gamePrizeId IN (SELECT id FROM gamePrizes WHERE gameId = ?)`)
      - `gamePrizes`
      - `gamePlayerSponsors`
      - `gameSponsors`
      - `jackpots`
      - `gamePlayers`
      - `gameGameTypes`
   3. Call `insertGameChildren(tx, gameId, data, initialCombinationId, callerInitialsCombinationId)`.
4. On success, `revalidatePath` for `/admin/games`, `/games`, and `/games/{gameId}` — same paths `addGame` revalidates.
5. Return `{ success: true }`. Any thrown error is caught and returned as `{ success: false, error: error.message }`.

### Data flow

```
GET /admin/games/[id]/edit
  → getGameById(id) + getGameFormOptions()  (parallel)
  → gameToFormValues(game)
  → render <AddGameForm mode="edit" gameId={id} defaultValues={...} formOptions={...} />

submit
  → updateGame(gameId, data)
    → validate via addGameSchema
    → tx { UPDATE games; DELETE children; insertGameChildren(...) }
    → revalidatePath × 3
  → on success: toast.success("Game updated"); router.push(`/games/${gameId}`)
  → on error:   toast.error(result.error)
```

## Error handling

- **Validation errors** surface through the existing react-hook-form + Zod path. No change.
- **Transactional failures** roll back automatically. The action returns `{ success: false, error }` and the form renders a Sonner error toast.
- **Game not found** at the edit route returns Next.js `notFound()`.
- **Unsaved changes** trigger the browser's native `beforeunload` warning while `formState.isDirty` is true.

## Files to create or modify

**Create:**

- `src/app/admin/games/[id]/edit/page.tsx` — server component edit page
- `src/lib/gameToFormValues.ts` — transform from `getGameById` shape to form values

**Modify:**

- `src/app/actions.ts` — add `updateGame`; extract `insertGameChildren` helper that both `addGame` and `updateGame` call
- `src/components/AddGameForm.tsx` — add `mode` / `gameId` / `defaultValues` props; branch submit handler; conditionally show Cancel button and use "Save Changes" label; wire up `beforeunload` for dirty state
- `src/app/admin/games/page.tsx` — add an "Edit" link/button per row in the games table

## Out of scope

- Auth and access control on `/admin/*`
- An "Edit" link on the public `/games/[id]` page (gated on auth)
- Audit log / who-edited-what tracking
- Optimistic concurrency control (last-write-wins is acceptable for a single-admin workflow)
- Soft delete / version history of prior game data
- Granular per-section editing on the public game detail page

## Verification

1. `npm run dev`. Navigate to `/admin/games`. Confirm an "Edit" link appears on each row.
2. Click "Edit" on an existing game. The form loads pre-filled with every section: header, players, items (each with clues and guesses), prizes, jackpot, sponsors, location, notes. Spot-check each section against the public `/games/[id]` view to confirm the defaults are correct.
3. Edit a header field (e.g. game date), save. Confirm the change persists on `/games/[id]` and on `/admin/games`.
4. Edit clue text on an existing item, save. Confirm `/games/[id]` shows the updated clue.
5. Change the player on an existing guess and the `clueHeard` value, save. Confirm both update.
6. Add a brand-new item with at least one clue and one correct guess; remove a different existing item entirely. Save. Confirm the items list reflects both changes and item numbering is contiguous.
7. Toggle `includePrize` / `includeJackpot` / `includeSponsors` on and off, save in each state. Confirm the corresponding sections appear/disappear correctly on the public view.
8. Attempt an invalid edit (e.g. mark two guesses correct on the same item). Confirm the form blocks submission with a clear validation error.
9. Mid-edit, attempt to navigate away (back button or close tab). Confirm the browser warns about unsaved changes.
10. Regression check: open `/admin/games`, use the original "Add Game" form to add a new game. Confirm the create flow still works unchanged.
