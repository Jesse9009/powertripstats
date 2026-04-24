# Watch and Listen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Watch and Listen" accordion section to the game detail page that surfaces per-game YouTube and audio embed iframes, with title varying based on which URLs are present.

**Architecture:** Add two nullable text columns (`video_url`, `audio_url`) to the `games` table, thread them through the server actions and admin form, then render a new `WatchAndListen` client component between `<GameHeader>` and `<FinalStandings>` on the game detail page.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM (libSQL/Turso), Zod, React Hook Form, Tailwind CSS v4, shadcn/ui Card.

---

## File Map

| Action | File |
|---|---|
| Modify | `src/db/schema.ts` |
| Modify | `src/app/actions.ts` |
| Modify | `src/components/AddGameForm.tsx` |
| Create | `src/components/GameDataPage/WatchAndListen.tsx` |
| Modify | `src/app/games/[id]/page.tsx` |

---

### Task 1: Add `videoUrl` and `audioUrl` to the schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the two columns to the `games` table**

In `src/db/schema.ts`, add `videoUrl` and `audioUrl` after the `notes` field (line 60):

```typescript
export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameNumber: integer("game_number").notNull(),
  gameDate: integer("game_date", { mode: "timestamp_ms" }).notNull(),
  hostParticipantId: integer("host_participant_id")
    .notNull()
    .references(() => participants.id),
  initialCombinationId: integer("initial_combination_id")
    .notNull()
    .references(() => initialCombinations.id),
  notes: text("notes"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  locationId: integer("location_id").references(() => locations.id),
});
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: Two new migration files created in `drizzle/` and applied successfully. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add video_url and audio_url columns to games table"
```

---

### Task 2: Update server actions

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add fields to `addGameSchema`**

In `src/app/actions.ts`, add after the `notes` field (line 39) inside `addGameSchema`:

```typescript
notes: z.string().trim().optional(),
videoUrl: z.string().trim().url().optional(),
audioUrl: z.string().trim().url().optional(),
```

- [ ] **Step 2: Include fields in `getGameById` select**

In `getGameById`, add `videoUrl` and `audioUrl` to the select object (after `locationName: locations.name`, around line 750):

```typescript
const game = await db
  .select({
    id: games.id,
    gameNumber: games.gameNumber,
    gameDate: games.gameDate,
    notes: games.notes,
    videoUrl: games.videoUrl,
    audioUrl: games.audioUrl,
    hostParticipantId: games.hostParticipantId,
    hostFirstName: participants.firstName,
    hostLastName: participants.lastName,
    hostNickname: participants.nickname,
    initialsCombination: initialCombinations.combination,
    locationId: games.locationId,
    locationName: locations.name,
  })
  // ... rest of query unchanged
```

- [ ] **Step 3: Insert fields in `addGame`**

In the `addGame` function, add to the games insert values (around line 594):

```typescript
const createdGame = await tx
  .insert(games)
  .values({
    gameNumber: parsed.gameNumber,
    gameDate: new Date(parsed.gameDate),
    hostParticipantId: parsed.hostParticipantId,
    initialCombinationId: initialsCombinationId,
    notes: parsed.notes?.trim() || null,
    videoUrl: parsed.videoUrl ?? null,
    audioUrl: parsed.audioUrl ?? null,
    locationId: parsed.locationId,
  })
  .returning({ id: games.id });
```

- [ ] **Step 4: Update fields in `updateGame`**

In the `updateGame` function, add to the games update set (around line 641):

```typescript
await tx
  .update(games)
  .set({
    gameNumber: parsed.gameNumber,
    gameDate: new Date(parsed.gameDate),
    hostParticipantId: parsed.hostParticipantId,
    initialCombinationId: initialsCombinationId,
    notes: parsed.notes?.trim() || null,
    videoUrl: parsed.videoUrl ?? null,
    audioUrl: parsed.audioUrl ?? null,
    locationId: parsed.locationId,
  })
  .where(eq(games.id, gameId));
```

- [ ] **Step 5: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: thread videoUrl and audioUrl through server actions"
```

---

### Task 3: Update the admin form

**Files:**
- Modify: `src/components/AddGameForm.tsx`

- [ ] **Step 1: Add fields to the client-side Zod schema**

The client schema is defined inside the component function (around line 36). Add after `notes: z.string().trim().optional()` (line 50):

```typescript
notes: z.string().trim().optional(),
videoUrl: z.string().trim().optional(),
audioUrl: z.string().trim().optional(),
```

- [ ] **Step 2: Add default values**

In the `useForm` default values (around line 281), add after `notes: ''`:

```typescript
notes: '',
videoUrl: '',
audioUrl: '',
```

- [ ] **Step 3: Add payload transforms**

In the `onSubmit` payload transform (around line 1085), add after the `notes` transform:

```typescript
notes: data.notes?.trim() || undefined,
videoUrl: data.videoUrl?.trim() || undefined,
audioUrl: data.audioUrl?.trim() || undefined,
```

- [ ] **Step 4: Add URL input fields to the form UI**

Immediately after the closing `</div>` of the "Players In This Game" `<div className="space-y-2">` block (after line 1305, before the `</section>` that ends the players section), insert a new `<div>` for the URL fields:

```tsx
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="videoUrl" className="text-sm font-medium">
                  Video URL (optional)
                </label>
                <input
                  id="videoUrl"
                  type="url"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="https://www.youtube.com/embed/..."
                  {...register('videoUrl')}
                />
                {errors.videoUrl && (
                  <p className="text-xs text-destructive">
                    {errors.videoUrl.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="audioUrl" className="text-sm font-medium">
                  Audio Embed URL (optional)
                </label>
                <input
                  id="audioUrl"
                  type="url"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="https://..."
                  {...register('audioUrl')}
                />
                {errors.audioUrl && (
                  <p className="text-xs text-destructive">
                    {errors.audioUrl.message}
                  </p>
                )}
              </div>
            </div>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/AddGameForm.tsx
git commit -m "feat: add videoUrl and audioUrl inputs to admin game form"
```

---

### Task 4: Create the `WatchAndListen` component

**Files:**
- Create: `src/components/GameDataPage/WatchAndListen.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/GameDataPage/WatchAndListen.tsx` with the full implementation:

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  gameNumber: number;
  videoUrl: string | null;
  audioUrl: string | null;
}

export function WatchAndListen({ gameNumber, videoUrl, audioUrl }: Props) {
  const [open, setOpen] = useState(true);

  if (!videoUrl && !audioUrl) return null;

  const title =
    videoUrl && audioUrl
      ? 'Watch and Listen'
      : videoUrl
        ? 'Watch'
        : 'Listen';

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none px-4 py-3"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </CardHeader>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {videoUrl && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={videoUrl}
                title={`Initials Game ${gameNumber}`}
                className="absolute inset-0 h-full w-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {audioUrl && (
            <iframe
              src={audioUrl}
              title="Game audio"
              className="w-full rounded"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          )}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/WatchAndListen.tsx
git commit -m "feat: add WatchAndListen accordion component"
```

---

### Task 5: Wire the component into the game detail page

**Files:**
- Modify: `src/app/games/[id]/page.tsx`

- [ ] **Step 1: Add the import and render the component**

Replace the current contents of `src/app/games/[id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation';
import { getGameById } from '@/app/actions';
import { GameHeader } from '@/components/GameDataPage/GameHeader';
import { ItemsGrid } from '@/components/GameDataPage/ItemsGrid';
import { FinalStandings } from '@/components/GameDataPage/FinalStandings';
import { WatchAndListen } from '@/components/GameDataPage/WatchAndListen';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  if (isNaN(gameId)) {
    notFound();
  }

  const game = await getGameById(gameId);

  if (!game) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
      <GameHeader
        gameNumber={game.gameNumber}
        gameDate={game.gameDate}
        hostFirstName={game.hostFirstName}
        hostLastName={game.hostLastName}
        hostNickname={game.hostNickname}
        initialsCombination={game.initialsCombination}
        locationName={game.locationName ?? null}
        gameSponsors={game.gameSponsors}
        players={game.players}
        jackpot={game.jackpot}
        prizes={game.prizes}
        notes={game.notes}
        items={game.items}
      />

      <WatchAndListen
        gameNumber={game.gameNumber}
        videoUrl={game.videoUrl ?? null}
        audioUrl={game.audioUrl ?? null}
      />

      <FinalStandings items={game.items} players={game.players} />

      {game.items.length > 0 && (
        <ItemsGrid items={game.items} players={game.players} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/games/[id]/page.tsx
git commit -m "feat: render WatchAndListen section on game detail page"
```

---

## Verification

1. Run `npm run dev` and open a game that has no `videoUrl` or `audioUrl` — confirm the section is absent.
2. Use the admin form to edit a game, fill in only the Audio Embed URL, save — confirm the section appears with title "Listen" and shows the audio iframe.
3. Also fill in the Video URL for the same game — confirm the title changes to "Watch and Listen" and the video iframe appears above the audio.
4. Edit a third game with only a Video URL — confirm title is "Watch" and only the video iframe renders.
5. Confirm the accordion is open by default, collapses on click, and re-expands on click.
6. Inspect the video iframe element — confirm `title` attribute is `"Initials Game N"` where N is the game number.
7. Run `npm run lint` — no new errors.
