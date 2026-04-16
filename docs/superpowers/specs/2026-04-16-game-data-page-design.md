# Game Data Page Design

## Overview

A page to display all data for a specific game in the PowerTripStats application. Shows game metadata, participants, prizes, game items with timeline-based clue progression, jackpot details, and sponsor information.

**Route:** `/games/[id]`

## Layout

- **Single scroll** — All sections stacked vertically
- Sections in order: Overview → Players → Prizes → Items → Jackpot → Sponsors

## Aesthetic

- **Editorial sports stats** — clean, magazine-style layout
- **Dark theme** with sharp accent colors
- **Distinctive typography** — characterful display font paired with refined body font
- **Generous whitespace**, clear typographic hierarchy

## Sections

### 1. Overview Section

- Hero card at top of page
- **Game number** — large display
- **Date** — formatted nicely
- **Host** — name with nickname if present
- **Initials combination** — displayed prominently
- **Notes** — shown as callout/quote if present

### 2. Players Section

- Grid of player cards (responsive: 2-4 columns)
- Each card shows:
  - Player name (first + last)
  - Nickname in parentheses if present
- For players with sponsors, show sponsor badges inline on card
- Player sponsor data: `game_player_sponsors` joined with `sponsors`

### 3. Prizes Section

- Card per prize
- Prize name prominent
- Beneficiaries listed below in pick order
- Visual indicator of pick order (numbered badges 1, 2, 3...)
- Data: `game_prizes` with `player_prize_beneficiaries` joined to `participants`

### 4. Items Section (Vertical Timeline)

- **Layout:** Vertical timeline per item, items stacked
- **Item header:** Item number + item type badge
- **Timeline:**
  - Clue bubbles connected by vertical line
  - Player guesses shown between clue reveals
  - Answer at bottom of timeline
- **Progressive reveal (when spoilers OFF):**
  - Clues hidden/masked initially
  - User clicks to reveal clues in sequence
  - Each reveal shows the clue + which guesses were made at that point
  - Final answer revealed last
- **When spoilers ON:**
  - All content visible at once
  - Timeline fully expanded

**Data model:**
- `game_items` — item number, type, answer
- `game_item_clues` — clue number, text, isCompleted
- `game_item_guesses` — player, guess text, isCorrect, linked to clue
- `participants` — player names
- `game_item_types` — type name

### 5. Jackpot Section

- Two-column layout (or side-by-side)
- **One Correct** column — amount
- **Both Correct** column — amount
- **Caller name** — if present
- **Caller guess** — initials combination guessed
- Data: `jackpots`, `initial_combinations` for caller guess

### 6. Sponsors Section

- Game sponsors: list of sponsors for this game
- Per-player sponsors: shown in Players section (not duplicated here)
- Data: `game_sponsors` joined with `sponsors`

## Data Fetching

Create server action `getGameById(id: number)` that fetches:
- Game with host, initials
- All related data via joins: players, prizes + beneficiaries, items + clues + guesses, jackpot, sponsors

Consider fetching related data in parallel for performance.

## Technical Notes

- Use existing `SiteSettingsContext` for spoiler toggle state
- Reuse existing UI components (Card, Badge, Table, etc.)
- Use `formatGameDateUTC` from `@/lib/utils`
- Use static generation with on-demand revalidation (`revalidate: false`) — cache forever but purge via `revalidatePath()` when games are edited through the admin UI
- For direct database modifications: add an API route `/api/revalidate-game/[id]` that can be called to purge the cache for a specific game

## Acceptance Criteria

1. Page loads at `/games/[id]` with correct game data
2. All 6 sections visible and properly laid out
3. Item timeline shows clues in sequence with guesses between
4. Spoiler toggle hides/reveals content in Items section
5. Responsive on mobile (single column) and desktop
6. Data populated from database correctly