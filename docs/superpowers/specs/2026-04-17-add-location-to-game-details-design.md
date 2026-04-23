# Add Location to Game Details Page — Design Spec

**Date:** 2026-04-17

## Context

Location data is already stored in the database (`games.locationId` → `locations.name`) and is required when creating a game via `AddGameForm`. However, `getGameById()` does not fetch location, so it never appears on the game details page. This spec closes that gap by surfacing location in the top overview section.

## What's Being Added

Display the game's location name in the `OverviewSection` card, in the existing 3-column grid alongside Host and Initials. The grid already declares `lg:grid-cols-3` but only populates 2 columns — Location fills the third.

## Files to Change

### 1. `src/app/actions.ts` — `getGameById()`

Join the `locations` table in the existing query and include `locationName` (nullable string) in the returned object.

### 2. `src/components/GameDataPage/OverviewSection.tsx`

- Add `locationName: string | null` to `OverviewSectionProps`
- Render it as a 3rd grid item with label "Location", conditionally (only when non-null), matching the existing Host/Initials label+value style

### 3. `src/app/games/[id]/page.tsx`

Pass `locationName` from the `getGameById()` result into `<OverviewSection>`.

## Constraints

- Location is nullable in the schema — games may have no location. Display only when present.
- No new components, no schema changes, no migrations needed.

## Verification

1. Run `npm run dev` and open a game details page for a game that has a location set — confirm "Location" appears as the third item in the top grid.
2. Open a game with no location set — confirm the grid shows only Host and Initials without a blank slot.
3. Run `npm run build` (or `tsc --noEmit`) to confirm no type errors.
