# Game Detail Page Redesign — Design Spec

**Date:** 2026-04-21

## Context

The current `/games/[id]` page displays game data as a vertical stack of 6 separate cards (Overview, Players, Prizes, Items Timeline, Jackpot, Sponsors). With 12–14 items per game and up to 6 clues each, the Items Timeline dominates the page and requires extensive scrolling. The redesign consolidates metadata into a compact header and replaces the vertical timeline with a responsive card grid.

## Goals

- Minimize scrolling — most of the page should be visible without extensive scrolling
- Serve two user types: quick-reference viewers (spoilers on) and play-along viewers (spoilers off)
- Maintain the existing no-spoilers functionality with explicit user action required for reveals
- Make items the primary focus of the page

## Layout Overview

The page has two zones:

1. **Header Zone** — compact, all game metadata in one card (~200px vertical on desktop)
2. **Items Grid** — responsive grid of item cards taking up the rest of the page

---

## Header Zone

A single card with up to 6 rows. Rows with no data are not rendered.

### Row 1: Title
- Game number (large, bold) left-aligned
- Game date right-aligned

### Row 2: Game Metadata
- Host name (with nickname if present)
- Location (if present)
- Initials combination
- Game sponsors as small badges

### Row 3: Players
- Player names in a horizontal row (badges/pills)
- Each player's sponsors shown below their name in smaller text

### Row 4: Jackpot
- One Correct and Both Correct amounts displayed inline
- Caller name and caller guess initials (if present)
- **Not rendered if no jackpot data exists**

### Row 5: Prizes
- De-emphasized — collapsed behind a disclosure/expandable link (e.g., "View Prizes")
- Shows prize names with beneficiaries and pick order when expanded
- **Not rendered if no prize data exists**

### Row 6: Notes
- Game notes displayed in an italic callout style (similar to current OverviewSection)
- **Not rendered if no notes exist**

---

## Items Grid

### Grid Layout

- **Desktop:** 3 columns
- **Tablet:** 2 columns
- **Mobile:** 1 column

### Controls

- When spoilers are on: an "Expand All" / "Collapse All" toggle at the top of the items section, so users don't have to interact with each card individually

### Item Card — Initial State (Spoilers Off)

- **Item number** badge (e.g., "#1")
- **"Tiebreaker"** badge shown only when the item's `itemType` indicates a tiebreaker; item type is NOT shown for regular items
- A **"Next Clue"** button
- Nothing else visible — no answer, no clues, no guesses

### Item Card — Progressive Reveal (Spoilers Off)

1. Each **"Next Clue"** click reveals the next clue text, appended below previously revealed clues
2. Guesses are **NOT** shown as clues are revealed
3. After all clues are revealed, the button changes to **"Reveal Answer"**
4. Clicking **"Reveal Answer"** shows:
   - The answer (prominently displayed)
   - All guesses for that item (who guessed, what they guessed, which clue they guessed on, whether it was correct)
5. Guesses appear automatically with the answer — no additional click required

### Item Card — Spoilers On

- All clues visible
- Answer shown
- All guesses shown
- Cards are fully expanded by default
- "Expand All" / "Collapse All" toggle at section top controls all cards at once. "Collapse All" returns cards to showing only the item number badge (and tiebreaker badge if applicable), same as the spoilers-off initial state but with content still accessible via clicks.

### Card Height Management

- Cards have a max height with internal scroll when content gets long (particularly items with 5–6 revealed clues plus guesses after answer reveal)

### Tiebreaker Items

- Identified by `itemType === "tiebreaker"` (exact lowercase string match)
- Visually distinguished with a "Tiebreaker" badge
- Maximum of 3 clues (vs. 6 for regular items)

---

## Spoiler Behavior Summary

| State | Clues | Answer | Guesses |
|-------|-------|--------|---------|
| Spoilers off, no interaction | Hidden | Hidden | Hidden |
| Spoilers off, after N "Next Clue" clicks | First N clues shown | Hidden | Hidden |
| Spoilers off, after "Reveal Answer" | All clues shown | Shown | Shown |
| Spoilers on | All shown | Shown | Shown |

---

## Files to Change

### New / Rewritten Components
- `src/components/GameDataPage/GameHeader.tsx` — new component replacing OverviewSection, PlayersSection, SponsorsSection, JackpotSection, and PrizesSection in the header zone
- `src/components/GameDataPage/ItemsGrid.tsx` — new component replacing ItemsTimeline
- `src/components/GameDataPage/ItemCard.tsx` — individual item card with progressive reveal logic

### Modified Files
- `src/app/games/[id]/page.tsx` — updated to use GameHeader + ItemsGrid instead of the 6 separate section components

### Removed Components (no longer used)
- `src/components/GameDataPage/OverviewSection.tsx`
- `src/components/GameDataPage/PlayersSection.tsx`
- `src/components/GameDataPage/SponsorsSection.tsx`
- `src/components/GameDataPage/JackpotSection.tsx`
- `src/components/GameDataPage/PrizesSection.tsx`
- `src/components/GameDataPage/ItemsTimeline.tsx`

### Unchanged
- `src/app/actions.ts` — `getGameById()` already returns all needed data
- `src/db/schema.ts` — no schema changes
- `src/context/SiteSettingsContext.tsx` — `showSpoilers` used as-is

## Constraints

- No database or schema changes
- No new dependencies
- Must work with existing `showSpoilers` context
- Responsive: desktop, tablet, mobile
- Existing shadcn/ui primitives (Card, Badge, Button) should be used where appropriate

## Verification

1. `npm run dev` — open a game page with 12+ items and confirm the header zone is compact and items render in a 3-column grid on desktop
2. Toggle spoilers off — confirm cards start in hidden state, "Next Clue" reveals clues one at a time, guesses are NOT shown until answer is revealed
3. Toggle spoilers on — confirm all cards fully expand, "Expand All"/"Collapse All" works
4. Check a game with no jackpot — confirm jackpot row is absent
5. Check a game with no prizes — confirm prizes row is absent
6. Check tiebreaker items (13/14) — confirm "Tiebreaker" badge appears
7. Test on mobile viewport — confirm single-column layout
8. `npm run build` — confirm no type errors
