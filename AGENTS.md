<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Generate SQL migrations from schema changes
npm run db:migrate   # Apply migrations to Turso
npm run db:studio    # Open Drizzle Studio
```

No test framework is configured.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:
- `TURSO_DATABASE_URL` — e.g. `libsql://my-db-org.turso.io`
- `TURSO_AUTH_TOKEN`

The app renders without DB env vars (shows a prompt to configure them), but all data operations require them.

## Architecture

**Stack:** Next.js 16 App Router + TypeScript, Tailwind CSS v4, Drizzle ORM (libSQL/Turso), shadcn/ui, react-hook-form + Zod, Sonner toasts.

### Data layer

All database queries and mutations live in `src/app/actions.ts` as Next.js Server Actions (`'use server'`). There are no separate API routes for data — pages call these actions directly.

`src/db/client.ts` exports two helpers:
- `getDb()` — returns `null` if env vars are missing; used in pages that render gracefully without a DB.
- `assertDb()` — throws if env vars are missing; used inside `addGame` and other mutations where missing config is a hard error.

Always check `if (!db)` when using `getDb()` before running queries.

### Schema

All Drizzle table definitions and inferred TypeScript types are in `src/db/schema.ts`. The domain models a trivia game show ("PowerTrip"):

- **`games`** — core record with `gameNumber`, `gameDate` (timestamp_ms), host participant, `initialCombinationId` (2-char letter combo for jackpot guesses), and optional `locationId`.
- **`gameItems`** — individual trivia items in a game, each with an `itemAnswer`.
- **`gameItemClues`** — ordered clues for each item (`clueNumber`, `isCompleted`).
- **`gameItemGuesses`** — one guess per player per item, linked to the clue they guessed on; `isCorrect` is stored explicitly.
- **`gamePrizes` / `playerPrizeBeneficiaries`** — prize tracking with player pick order.
- **`jackpots`** — jackpot amounts and caller info for each game.
- **`gameSponsors` / `gamePlayerSponsors`** — sponsor associations at game and player level.
- **`initialCombinations`** — deduplicated table of 2-char uppercase letter combos; `findOrCreateInitialCombinationId` handles upsert logic inside transactions.

### Adding a game

`addGame` in `actions.ts` runs everything in a single Drizzle transaction: creates the game, inserts game types, players, prizes + beneficiaries, jackpot, sponsors, and all items with their clues and guesses. Correct guesses are always linked to the last clue of an item; incorrect guesses are linked to the clue they were made on.

### Client-side contexts

`src/context/SiteSettingsContext.tsx` — tracks `showSpoilers` (boolean). When false, answers and clues in `ItemsTimeline` are hidden behind reveal buttons. `ThemeContext` manages dark/light mode and persists to `localStorage`.

### Game detail page

`/games/[id]` assembles data via `getGameById` (multiple sequential DB queries that are then deduplicated and merged in JS) and passes it to section components in `src/components/GameDataPage/`. The `ItemsTimeline` component is a `'use client'` component that manages per-clue reveal state.

### Cache revalidation

`addGame` calls `revalidatePath` for `/admin/games`, `/games`, and the specific game page after a successful insert. A POST-only API route at `/api/revalidate-game/[id]` allows manual revalidation. Admin game list uses `export const dynamic = 'force-dynamic'`.

### Dates

Game dates are stored as integer milliseconds (Drizzle `timestamp_ms` mode). Always use `formatGameDateUTC` from `src/lib/utils.ts` for display to avoid timezone drift.

### UI conventions

- `src/components/ui/` — shadcn/ui-style primitives (Button, Card, Table, Input, Switch, Badge, Combobox, ConfirmDialog, Toaster).
- `cn()` from `src/lib/utils.ts` for conditional className merging.
- Admin routes are defined in `src/config/adminRoutes.ts` and rendered in `AdminDropdown`.
- `Breadcrumbs` calls `getGameNumber` (a server action) client-side via `useEffect` to resolve numeric IDs to game numbers for display.
