# Watch and Listen Section — Design Spec

## Context

The game detail page (`/games/[id]`) currently has no way to surface the associated YouTube episode or podcast audio for a game. This feature adds a "Watch and Listen" accordion section (title varies by available media) that lets visitors watch or listen inline without leaving the page.

---

## Data Layer

### Schema (`src/db/schema.ts`)

Add two nullable text columns to the `games` table:

```typescript
videoUrl: text("video_url"),
audioUrl: text("audio_url"),
```

Run `npm run db:generate` then `npm run db:migrate` after the schema change.

### Server action: `getGameById` (`src/app/actions.ts`)

Select and return both new fields alongside existing game data. No structural changes — just include the fields in the query and the returned object.

### Server action: `addGame` + `addGameSchema` (`src/app/actions.ts`)

- Add `videoUrl: z.string().trim().url().optional()` and `audioUrl: z.string().trim().url().optional()` to `addGameSchema`
- In the `addGame` body, insert `videoUrl: parsed.videoUrl ?? null` and `audioUrl: parsed.audioUrl ?? null` into the games insert

---

## Admin Form (`src/components/AddGameForm.tsx`)

Add two optional URL fields to the client-side Zod schema and form UI, following the existing `notes` pattern:

- **Client schema:** `videoUrl: z.string().trim().url().optional().or(z.literal(''))` and same for `audioUrl`
- **UI placement:** Immediately after the "Players In This Game" section, in their own labeled section
- **Labels:** "Video URL (optional)" and "Audio Embed URL (optional)"
- **Transform on submit:** Pass through as-is; empty string → omit from payload (same as `notes`)

---

## `WatchAndListen` Component (`src/components/GameDataPage/WatchAndListen.tsx`)

A `'use client'` component.

### Props
```typescript
interface Props {
  gameNumber: number;
  videoUrl: string | null;
  audioUrl: string | null;
}
```

### Visibility
- Return `null` when both `videoUrl` and `audioUrl` are null.

### Title logic
| videoUrl | audioUrl | Title |
|---|---|---|
| present | present | "Watch and Listen" |
| null | present | "Listen" |
| present | null | "Watch" |

### Accordion behavior
- `useState(true)` — open by default
- Card wrapper with a clickable header row containing the title and a chevron icon (rotates 180° when closed)
- Smooth height transition via `overflow-hidden` + `max-height` or a simple conditional render

### Iframe layout
- Video iframe rendered first (when present): `title="Initials Game {gameNumber}"`, 16:9 aspect ratio, full width
- Audio iframe rendered below YouTube (when present): full width, fixed height appropriate for an audio player

---

## Page Integration (`src/app/games/[id]/page.tsx`)

Render `<WatchAndListen>` between `<GameHeader>` and `<FinalStandings>`:

```tsx
<GameHeader ... />
<WatchAndListen
  gameNumber={game.gameNumber}
  videoUrl={game.videoUrl}
  audioUrl={game.audioUrl}
/>
<FinalStandings ... />
```

The component already returns `null` when there's no media, so no conditional guard needed at the page level.

---

## Verification

1. Run `npm run db:generate` and `npm run db:migrate` — confirm migration applies cleanly
2. Start dev server (`npm run dev`)
3. Open an existing game with no URLs — confirm the section does not appear
4. Via admin form, create or edit a game with only an audio URL — confirm section appears with title "Listen" and audio iframe
5. Add a video URL to the same game — confirm title changes to "Watch and Listen" and video iframe appears above audio
6. Test a game with only a video URL — confirm title is "Watch" with only the video iframe
7. Confirm accordion opens by default and toggles open/closed on click
8. Confirm video iframe title attribute is "Initials Game [number]"
