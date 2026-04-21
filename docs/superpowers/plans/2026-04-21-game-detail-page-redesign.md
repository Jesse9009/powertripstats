# Game Detail Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vertically-stacked card layout on `/games/[id]` with a compact header zone and responsive item card grid to minimize scrolling and support both quick-reference and play-along use cases.

**Architecture:** The page has two zones: a single `GameHeader` card consolidating all metadata (overview, players, jackpot, prizes, notes), and an `ItemsGrid` component rendering items as a responsive grid of `ItemCard` components with progressive clue reveal. All item reveal state is lifted into `ItemsGrid` so that Expand All / Collapse All can control every card at once.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Card, Badge, Button)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/GameDataPage/GameHeader.tsx` | Create | Compact header card: title, metadata, players, jackpot, prizes, notes |
| `src/components/GameDataPage/ItemCard.tsx` | Create | Single item card with progressive reveal, controlled by parent |
| `src/components/GameDataPage/ItemsGrid.tsx` | Create | Responsive grid, owns all reveal state, Expand/Collapse All controls |
| `src/app/games/[id]/page.tsx` | Modify | Wire up GameHeader + ItemsGrid, remove old component imports |
| `src/components/GameDataPage/OverviewSection.tsx` | Delete | Replaced by GameHeader |
| `src/components/GameDataPage/PlayersSection.tsx` | Delete | Replaced by GameHeader |
| `src/components/GameDataPage/SponsorsSection.tsx` | Delete | Replaced by GameHeader |
| `src/components/GameDataPage/JackpotSection.tsx` | Delete | Replaced by GameHeader |
| `src/components/GameDataPage/PrizesSection.tsx` | Delete | Replaced by GameHeader |
| `src/components/GameDataPage/ItemsTimeline.tsx` | Delete | Replaced by ItemsGrid + ItemCard |

---

### Task 1: Create GameHeader Component

**Files:**
- Create: `src/components/GameDataPage/GameHeader.tsx`

This is a server component (no `'use client'`). It receives all metadata as props and renders a single compact card.

- [ ] **Step 1: Create the GameHeader component**

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatGameDateUTC } from '@/lib/utils';

interface Beneficiary {
  name: string;
  pickOrder: number;
}

interface Prize {
  prize: string;
  beneficiaries: Beneficiary[];
}

interface Player {
  firstName: string;
  lastName: string;
  nickname: string | null;
  sponsors: string[];
}

interface Jackpot {
  oneCorrect: number;
  bothCorrect: number;
  callerName: string | null;
  callerGuessInitials: string | null;
}

interface GameHeaderProps {
  gameNumber: number;
  gameDate: Date | string;
  hostFirstName: string;
  hostLastName: string;
  hostNickname: string | null;
  initialsCombination: string;
  locationName: string | null;
  gameSponsors: string[];
  players: Player[];
  jackpot: Jackpot | null;
  prizes: Prize[];
  notes: string | null;
}

export function GameHeader({
  gameNumber,
  gameDate,
  hostFirstName,
  hostLastName,
  hostNickname,
  initialsCombination,
  locationName,
  gameSponsors,
  players,
  jackpot,
  prizes,
  notes,
}: GameHeaderProps) {
  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
      <CardHeader className="pb-2">
        {/* Row 1: Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            Game #{gameNumber}
          </h1>
          <span className="text-lg text-muted-foreground">
            {formatGameDateUTC(gameDate)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Row 2: Game Metadata */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Host: </span>
            <span className="font-medium">
              {hostFirstName} {hostLastName}
              {hostNickname && (
                <span className="text-muted-foreground"> ({hostNickname})</span>
              )}
            </span>
          </div>
          {locationName && (
            <div>
              <span className="text-muted-foreground">Location: </span>
              <span className="font-medium">{locationName}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Initials: </span>
            <span className="font-mono font-bold text-primary">
              {initialsCombination}
            </span>
          </div>
          {gameSponsors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sponsors:</span>
              {gameSponsors.map((sponsor) => (
                <Badge key={sponsor} variant="outline" className="text-xs">
                  {sponsor}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Players */}
        {players.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {players.map((player, index) => (
              <div key={index} className="flex flex-col items-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {player.firstName} {player.lastName}
                  {player.nickname && (
                    <span className="text-muted-foreground ml-1">
                      ({player.nickname})
                    </span>
                  )}
                </Badge>
                {player.sponsors.length > 0 && (
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {player.sponsors.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Row 4: Jackpot */}
        {jackpot && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Jackpot (1 correct): </span>
              <span className="font-bold text-primary">
                ${jackpot.oneCorrect.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Jackpot (both correct): </span>
              <span className="font-bold text-primary">
                ${jackpot.bothCorrect.toLocaleString()}
              </span>
            </div>
            {jackpot.callerName && (
              <div>
                <span className="text-muted-foreground">Caller: </span>
                <span className="font-medium">
                  {jackpot.callerName}
                  {jackpot.callerGuessInitials && (
                    <span className="text-muted-foreground">
                      {' '}&mdash; guessed{' '}
                      <span className="font-mono font-bold">
                        {jackpot.callerGuessInitials}
                      </span>
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Row 5: Prizes (collapsed) */}
        {prizes.length > 0 && <PrizesDisclosure prizes={prizes} />}

        {/* Row 6: Notes */}
        {notes && (
          <div className="rounded-lg bg-muted/50 p-3 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrizesDisclosure({ prizes }: { prizes: Prize[] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        View Prizes ({prizes.length})
      </summary>
      <div className="mt-2 space-y-2 pl-4">
        {prizes.map((prize, index) => (
          <div key={index}>
            <span className="font-medium">{prize.prize}</span>
            {prize.beneficiaries.length > 0 && (
              <span className="text-muted-foreground">
                {' '}&mdash;{' '}
                {prize.beneficiaries
                  .sort((a, b) => a.pickOrder - b.pickOrder)
                  .map((b) => `${b.pickOrder}. ${b.name}`)
                  .join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `GameHeader.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/GameDataPage/GameHeader.tsx
git commit -m "feat: add GameHeader component for compact game metadata display"
```

---

### Task 2: Create ItemCard Component

**Files:**
- Create: `src/components/GameDataPage/ItemCard.tsx`

This is a `'use client'` component. It does NOT own its reveal state — the parent passes in the number of revealed clues and whether the answer is revealed, plus callbacks. This allows `ItemsGrid` to control all cards for Expand/Collapse All.

- [ ] **Step 1: Create the ItemCard component**

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Clue {
  id: number;
  number: number;
  text: string;
  completed: boolean;
}

interface Guess {
  playerId: number;
  playerName: string;
  guess: string | null;
  isCorrect: boolean;
  clueNumber: number;
}

export interface ItemData {
  itemNumber: number;
  itemType: string;
  answer: string;
  clues: Clue[];
  guesses: Guess[];
}

interface ItemCardProps {
  item: ItemData;
  revealedClueCount: number;
  answerRevealed: boolean;
  onRevealNextClue: () => void;
  onRevealAnswer: () => void;
}

const TIEBREAKER_TYPE = 'tiebreaker';

export function ItemCard({
  item,
  revealedClueCount,
  answerRevealed,
  onRevealNextClue,
  onRevealAnswer,
}: ItemCardProps) {
  const isTiebreaker = item.itemType.toLowerCase() === TIEBREAKER_TYPE;
  const allCluesRevealed = revealedClueCount >= item.clues.length;
  const visibleClues = item.clues.slice(0, revealedClueCount);

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Item header */}
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-base px-2.5 py-0.5">
            #{item.itemNumber}
          </Badge>
          {isTiebreaker && (
            <Badge variant="destructive" className="text-xs">
              Tiebreaker
            </Badge>
          )}
        </div>

        {/* Revealed clues */}
        {visibleClues.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {visibleClues.map((clue) => (
              <div
                key={clue.id}
                className={`p-2 rounded text-sm ${
                  clue.completed
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/50'
                }`}
              >
                <span className="font-medium text-muted-foreground mr-1.5">
                  {clue.number}.
                </span>
                {clue.text}
              </div>
            ))}
          </div>
        )}

        {/* Answer */}
        {answerRevealed && (
          <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-sm font-medium">Answer: </span>
            <span className="font-bold">{item.answer}</span>
          </div>
        )}

        {/* Guesses (shown only after answer is revealed) */}
        {answerRevealed && item.guesses.length > 0 && (
          <div className="space-y-1">
            {item.guesses.map((guess, gIndex) => (
              <div
                key={gIndex}
                className={`text-sm p-1.5 rounded ${
                  guess.isCorrect
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-muted/30'
                }`}
              >
                <span className="font-medium">{guess.playerName}</span>
                <span className="text-muted-foreground text-xs ml-1">
                  (clue {guess.clueNumber})
                </span>
                :{' '}
                {guess.guess || (guess.isCorrect ? item.answer : '(no guess)')}
                {guess.isCorrect && (
                  <Badge variant="default" className="ml-1.5 text-xs px-1.5 py-0">
                    Correct
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        {!answerRevealed && (
          <Button
            variant="outline"
            size="sm"
            onClick={allCluesRevealed ? onRevealAnswer : onRevealNextClue}
            className="w-full mt-auto"
          >
            {allCluesRevealed ? 'Reveal Answer' : 'Next Clue'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `ItemCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/GameDataPage/ItemCard.tsx
git commit -m "feat: add ItemCard component with controlled progressive reveal"
```

---

### Task 3: Create ItemsGrid Component

**Files:**
- Create: `src/components/GameDataPage/ItemsGrid.tsx`

This is a `'use client'` component. It owns all reveal state for every item and provides Expand All / Collapse All controls. It reads `showSpoilers` from context.

- [ ] **Step 1: Create the ItemsGrid component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { ItemCard, type ItemData } from '@/components/GameDataPage/ItemCard';

interface ItemsGridProps {
  items: ItemData[];
}

interface ItemRevealState {
  revealedClueCount: number;
  answerRevealed: boolean;
}

export function ItemsGrid({ items }: ItemsGridProps) {
  const { showSpoilers } = useSiteSettings();

  const makeDefaultState = (expanded: boolean): Map<number, ItemRevealState> => {
    const map = new Map<number, ItemRevealState>();
    items.forEach((item) => {
      map.set(item.itemNumber, {
        revealedClueCount: expanded ? item.clues.length : 0,
        answerRevealed: expanded,
      });
    });
    return map;
  };

  const [revealState, setRevealState] = useState<Map<number, ItemRevealState>>(
    () => makeDefaultState(showSpoilers),
  );
  const [allExpanded, setAllExpanded] = useState(showSpoilers);

  useEffect(() => {
    setRevealState(makeDefaultState(showSpoilers));
    setAllExpanded(showSpoilers);
  }, [showSpoilers]);

  const revealNextClue = (itemNumber: number) => {
    setRevealState((prev) => {
      const next = new Map(prev);
      const current = next.get(itemNumber);
      if (!current) return prev;
      const item = items.find((i) => i.itemNumber === itemNumber);
      if (!item) return prev;
      if (current.revealedClueCount < item.clues.length) {
        next.set(itemNumber, {
          ...current,
          revealedClueCount: current.revealedClueCount + 1,
        });
      }
      return next;
    });
  };

  const revealAnswer = (itemNumber: number) => {
    setRevealState((prev) => {
      const next = new Map(prev);
      const current = next.get(itemNumber);
      if (!current) return prev;
      const item = items.find((i) => i.itemNumber === itemNumber);
      if (!item) return prev;
      next.set(itemNumber, {
        revealedClueCount: item.clues.length,
        answerRevealed: true,
      });
      return next;
    });
  };

  const expandAll = () => {
    setRevealState(makeDefaultState(true));
    setAllExpanded(true);
  };

  const collapseAll = () => {
    setRevealState(makeDefaultState(false));
    setAllExpanded(false);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Items</h2>
        <Button variant="outline" size="sm" onClick={allExpanded ? collapseAll : expandAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const state = revealState.get(item.itemNumber) ?? {
            revealedClueCount: 0,
            answerRevealed: false,
          };
          return (
            <ItemCard
              key={item.itemNumber}
              item={item}
              revealedClueCount={state.revealedClueCount}
              answerRevealed={state.answerRevealed}
              onRevealNextClue={() => revealNextClue(item.itemNumber)}
              onRevealAnswer={() => revealAnswer(item.itemNumber)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `ItemsGrid.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/GameDataPage/ItemsGrid.tsx
git commit -m "feat: add ItemsGrid with centralized reveal state and expand/collapse all"
```

---

### Task 4: Wire Up the Page and Remove Old Components

**Files:**
- Modify: `src/app/games/[id]/page.tsx`
- Delete: `src/components/GameDataPage/OverviewSection.tsx`
- Delete: `src/components/GameDataPage/PlayersSection.tsx`
- Delete: `src/components/GameDataPage/SponsorsSection.tsx`
- Delete: `src/components/GameDataPage/JackpotSection.tsx`
- Delete: `src/components/GameDataPage/PrizesSection.tsx`
- Delete: `src/components/GameDataPage/ItemsTimeline.tsx`

- [ ] **Step 1: Rewrite the page component**

Replace the entire contents of `src/app/games/[id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation';
import { getGameById } from '@/app/actions';
import { GameHeader } from '@/components/GameDataPage/GameHeader';
import { ItemsGrid } from '@/components/GameDataPage/ItemsGrid';

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <GameHeader
        gameNumber={game.gameNumber}
        gameDate={game.gameDate}
        hostFirstName={game.hostFirstName}
        hostLastName={game.hostLastName}
        hostNickname={game.hostNickname}
        initialsCombination={game.initialsCombination}
        locationName={game.locationName}
        gameSponsors={game.gameSponsors}
        players={game.players}
        jackpot={game.jackpot}
        prizes={game.prizes}
        notes={game.notes}
      />

      {game.items.length > 0 && <ItemsGrid items={game.items} />}
    </main>
  );
}
```

- [ ] **Step 2: Delete old components**

```bash
rm src/components/GameDataPage/OverviewSection.tsx
rm src/components/GameDataPage/PlayersSection.tsx
rm src/components/GameDataPage/SponsorsSection.tsx
rm src/components/GameDataPage/JackpotSection.tsx
rm src/components/GameDataPage/PrizesSection.tsx
rm src/components/GameDataPage/ItemsTimeline.tsx
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors. All old imports removed, new imports resolve.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Open a game page (e.g., `http://localhost:3000/games/1`) and verify:
- Header zone is compact with all 6 rows rendering correctly (conditional rows hidden when data is absent)
- Items display in a 3-column grid on desktop
- "Next Clue" reveals clues one at a time
- "Reveal Answer" shows answer + guesses
- Toggle site spoilers on — all cards expand, "Expand All"/"Collapse All" works
- Resize to mobile — single column layout
- Check a tiebreaker item shows "Tiebreaker" badge

- [ ] **Step 5: Verify production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: redesign game detail page with compact header and item card grid

Replace 6 stacked section cards with a compact GameHeader and responsive
ItemsGrid. Items display as a 3-column grid with progressive clue reveal.
Expand All / Collapse All controls all cards at once when spoilers are on."
```

---

## Verification Checklist

After all tasks are complete, verify each item from the spec:

1. `npm run dev` — open a game page with 12+ items, confirm compact header + 3-column grid on desktop
2. Spoilers off — cards start hidden, "Next Clue" reveals one clue at a time, guesses hidden until "Reveal Answer"
3. Spoilers on — all cards fully expand, "Expand All"/"Collapse All" works
4. Game with no jackpot — jackpot row absent from header
5. Game with no prizes — prizes row absent from header
6. Tiebreaker items — "Tiebreaker" badge appears for items with `itemType === "tiebreaker"`
7. Mobile viewport — single-column layout
8. `npm run build` — no type errors
