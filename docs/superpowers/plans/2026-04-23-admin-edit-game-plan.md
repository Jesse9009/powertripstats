# Plan: Admin Edit Existing Games

Spec: `docs/superpowers/specs/2026-04-23-admin-edit-game-design.md`

## Before implementing

**Invoke these skills first (in order):**
1. `superpowers:executing-plans` — establishes the implementation workflow for this session
2. `superpowers:test-driven-development` — guides how to approach each unit before writing it

**Read these files before writing any code.** The plan describes the architecture; the files contain the exact shapes and patterns you must match:

| File | What to extract |
|------|-----------------|
| `src/db/schema.ts` | All FK relationships and cascade rules — verify the delete order in `updateGame` is correct |
| `src/app/actions.ts` | Full `addGame` function — identify the exact start/end of the child-insert block to extract into `insertGameChildren`; study `findOrCreateInitialCombinationId` and `getGameById` return type |
| `src/components/AddGameForm.tsx` | The `createSchema()` Zod schema (every field name and its type/toggle direction); the `FormValues` TypeScript type inferred from it; how `useForm` is initialised; how the form inverts booleans on submit (`isNotCompleted` → `isCompleted`, `isIncorrect` → `isCorrect`) |
| `src/app/admin/games/page.tsx` | Current table row structure to know where to add the Edit link |

**High-risk area — `gameToFormValues`:** This transform is the most error-prone piece. It must invert every boolean the form uses (`isCompleted` → `isNotCompleted`, `isCorrect` → `isIncorrect`), reshape nested arrays (items → positional index, player-sponsor pairs), parse the ms timestamp into the form's date string, and set the three `include*` flags from the presence of related records. Read both `AddGameForm`'s schema and `getGameById`'s return type side-by-side before writing a single line of this function.

**Invoke before declaring done:**
- `superpowers:verification-before-completion` — run the verification steps below and confirm output before claiming the feature is complete
- `superpowers:requesting-code-review` — request a review of the completed work

## Context

Admins currently have no UI to fix mistakes in a game after submission via `AddGameForm` — wrong clue text, wrong player on a guess, wrong `clueHeard`, missing sponsor, incorrect jackpot. We need a first-class admin edit experience that preserves the deeply nested item / clue / guess relationships and always saves atomically.

Approach: a full-form edit page that **reuses `AddGameForm` in an "edit" mode**, backed by a new `updateGame` server action that **deletes and recreates all child rows inside one Drizzle transaction**. Internal child IDs (`gameItems.id`, `gameItemClues.id`, `gameItemGuesses.id`, etc.) are not referenced by anything outside a game's own subgraph, so this is safe.

Auth is intentionally out of scope — this feature inherits the same access posture as the rest of `/admin/*`.

## Files to create

- `src/app/admin/games/[id]/edit/page.tsx` — server component edit page. Loads `getGameById(id)` + `getGameFormOptions()` in parallel, transforms the game via `gameToFormValues`, renders `<AddGameForm mode="edit" gameId={id} defaultValues={...} formOptions={...} />`. `notFound()` when the game does not exist.
- `src/lib/gameToFormValues.ts` — pure function converting the `getGameById` shape into the form's `FormValues` shape.

## Files to modify

- `src/app/actions.ts`
  - Extract the child-insert block currently inside `addGame`'s transaction (game types, players, prizes, beneficiaries, jackpot, sponsors, items/clues/guesses) into a private helper `insertGameChildren(tx, gameId, data, initialCombinationId, callerInitialsCombinationId)`.
  - Have `addGame` call the new helper (no behaviour change).
  - Add `updateGame(gameId, data)`:
    1. Validate against `addGameSchema`.
    2. Resolve `initialCombinationId` and optional jackpot caller initials combination.
    3. Open transaction:
       - UPDATE `games` row (`gameNumber`, `gameDate`, `hostParticipantId`, `initialCombinationId`, `locationId`, `notes`).
       - DELETE all child rows for `gameId` in FK-safe order: `gameItemGuesses` → `gameItemClues` → `gameItems` → `playerPrizeBeneficiaries` → `gamePrizes` → `gamePlayerSponsors` → `gameSponsors` → `jackpots` → `gamePlayers` → `gameGameTypes`.
       - Call `insertGameChildren(tx, gameId, data, ...)`.
    4. `revalidatePath('/admin/games')`, `revalidatePath('/games')`, `revalidatePath('/games/{gameId}')`.
    5. Return `{ success: true }` or `{ success: false, error }`.
- `src/components/AddGameForm.tsx`
  - New optional props: `mode?: 'create' | 'edit'` (default `'create'`), `gameId?: number`, `defaultValues?: FormValues`.
  - Branch the submit handler on `mode`: call `addGame(data)` or `updateGame(gameId, data)`.
  - Submit button label: `"Save Changes"` in edit mode, otherwise `"Add Game"`.
  - Conditionally render a "Cancel" button in edit mode that `router.push`es to `/admin/games`.
  - `useEffect` that registers a `beforeunload` handler while `formState.isDirty` is true (browser-native unsaved-changes warning).
- `src/app/admin/games/page.tsx`
  - Add an "Edit" link per row in the games table pointing at `/admin/games/{id}/edit`.

## Reused code

- `addGameSchema` (`src/app/actions.ts`) — same Zod validation for create and edit.
- `findOrCreateInitialCombinationId` (`src/app/actions.ts`) — used inside `updateGame` exactly as in `addGame`.
- `getGameById` (`src/app/actions.ts`) — feeds the edit page's defaults.
- `getGameFormOptions` (`src/app/actions.ts`) — feeds the form's dropdown options.
- `AddGameForm` (`src/components/AddGameForm.tsx`) — reused via `mode` / `defaultValues` props; no fork.

## Out of scope

- Auth on `/admin/*`
- Edit link on the public `/games/[id]` page (gated on auth)
- Audit log
- Optimistic concurrency
- Soft delete / version history
- Granular per-section inline editing

## Verification

1. `npm run dev`. Navigate to `/admin/games`. Confirm an "Edit" link appears on each row.
2. Click Edit on an existing game. Confirm every section is pre-filled correctly: header, players, items (each with clues and guesses), prizes, jackpot, sponsors, location, notes. Spot-check against `/games/[id]`.
3. Edit a header field (e.g. game date) and save. Confirm change on `/games/[id]` and `/admin/games`.
4. Edit clue text on an item, save. Confirm `/games/[id]` shows the updated clue.
5. Change the player and `clueHeard` on an existing guess, save. Confirm both update.
6. Add a brand-new item with one clue and one correct guess; remove a different existing item. Save. Confirm items list reflects both changes and numbering is contiguous.
7. Toggle `includePrize` / `includeJackpot` / `includeSponsors` on and off across multiple saves. Confirm sections appear/disappear correctly on the public view.
8. Attempt an invalid edit (two correct guesses on one item). Confirm the form blocks submission with a clear error.
9. Mid-edit, attempt to navigate away. Confirm the browser warns about unsaved changes.
10. Regression: open `/admin/games`, use the original "Add Game" form to add a new game. Confirm create still works.
