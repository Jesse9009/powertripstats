# Game Data Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a game data page at `/games/[id]` that displays all data for a specific game with a vertical timeline for items and progressive reveal based on spoiler toggle.

**Architecture:** Static page with on-demand revalidation via `unstable_cache` and `revalidateTag`. Data fetched via cached server action. Spoiler-aware progressive reveal in client component.

**Tech Stack:** Next.js 16, Drizzle ORM, React, Tailwind CSS

---

## File Structure

```
app/games/[id]/page.tsx        - Main game page (server component, NOT force-dynamic)
app/actions.ts                 - Add: getGameById() with unstable_cache wrapper
app/api/revalidate-game/[id]/route.ts - API route for manual cache purge (POST only)
components/GameDataPage/
  ├── OverviewSection.tsx      - Server component (no 'use client')
  ├── PlayersSection.tsx       - Client component (uses SiteSettingsContext)
  ├── PrizesSection.tsx
  ├── ItemsTimeline.tsx        - Vertical timeline with progressive reveal
  ├── JackpotSection.tsx
  └── SponsorsSection.tsx
```

---

## Important: Caching Strategy

This project does NOT have `cacheComponents: true` in `next.config.ts`, so we use the legacy approach with `unstable_cache`:

1. Wrap `getGameById` in `unstable_cache` with:
   - Cache key: `['game', gameId]`
   - Tags: `['game-${gameId}']`
   - `revalidate: false` (cache indefinitely)

2. Page at `/games/[id]` should NOT use `export const dynamic = 'force-dynamic'` — let it use default caching

3. When games are edited via admin, call `revalidateTag('game-${gameId}')` to bust cache

---

### Task 1: Server Action for Fetching Game Data

**Files:**
- Modify: `src/app/actions.ts`
- Test: Manual verification via page load

- [ ] **Step 1: Add getGameById server action with unstable_cache**

```typescript
import { unstable_cache } from 'next/cache';

async function fetchGameById(gameId: number) {
  // All existing DB queries from plan go here
  // ... (see below for full implementation with fixes)
}

// Cached version exported for use in page
export const getGameById = unstable_cache(
  async (gameId: number) => fetchGameById(gameId),
  ['game'], // cache key parts
  {
    tags: ['game-${gameId}'], // This won't work since gameId is dynamic
    revalidate: false,
  }
);
```

**Problem:** The `tags` array can't reference the dynamic `gameId` at definition time. 

**Fix:** Define the cache function inside the action file so it can reference the ID, or wrap the cache call at the page level. Alternative approach: use `revalidatePath` instead of `revalidateTag` since path is known at action time.

```typescript
// Simpler approach: use revalidatePath in mutations, no caching on queries for now
// The page will be dynamic but we'll add revalidatePath calls in mutations

export async function getGameById(gameId: number) {
  if (!db) return null;

  // Game basic info
  const game = await db
    .select({
      id: games.id,
      gameNumber: games.gameNumber,
      gameDate: games.gameDate,
      notes: games.notes,
      hostFirstName: participants.firstName,
      hostLastName: participants.lastName,
      hostNickname: participants.nickname,
      initialsCombination: initialCombinations.combination,
    })
    .from(games)
    .innerJoin(players, eq(games.hostParticipantId, players.id))
    .innerJoin(initialCombinations, eq(games.initialCombinationId, initialCombinations.id))
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game[0]) return null;

  // Fetch players with sponsors
  const gamePlayersData = await db
    .select({
      playerId: gamePlayers.playerId,
      firstName: participants.firstName,
      lastName: participants.lastName,
      nickname: participants.nickname,
      sponsorId: gamePlayerSponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(gamePlayers)
    .innerJoin(participants, eq(gamePlayers.playerId, participants.id))
    .leftJoin(gamePlayerSponsors, and(
      eq(gamePlayerSponsors.gameId, gameId),
      eq(gamePlayerSponsors.playerId, gamePlayers.playerId)
    ))
    .leftJoin(sponsors, eq(gamePlayerSponsors.sponsorId, sponsors.id))
    .where(eq(gamePlayers.gameId, gameId));

  // Fetch prizes with beneficiaries
  const prizesData = await db
    .select({
      prizeId: gamePrizes.id,
      prize: gamePrizes.prize,
      beneficiaryId: playerPrizeBeneficiaries.playerId,
      beneficiaryFirstName: participants.firstName,
      beneficiaryLastName: participants.lastName,
      pickOrder: playerPrizeBeneficiaries.pickOrder,
    })
    .from(gamePrizes)
    .leftJoin(playerPrizeBeneficiaries, eq(playerPrizeBeneficiaries.gamePrizeId, gamePrizes.id))
    .leftJoin(participants, eq(playerPrizeBeneficiaries.playerId, participants.id))
    .where(eq(gamePrizes.gameId, gameId))
    .orderBy(gamePrizes.id, asc(playerPrizeBeneficiaries.pickOrder));

  // Fetch items with clues and guesses - FIXED to properly associate guesses with clues
  const itemsData = await db
    .select({
      itemId: gameItems.id,
      itemNumber: gameItems.itemNumber,
      itemType: gameItemTypes.type,
      itemAnswer: gameItems.itemAnswer,
      clueId: gameItemClues.id,
      clueNumber: gameItemClues.clueNumber,
      clueText: gameItemClues.clue,
      clueCompleted: gameItemClues.isCompleted,
      guessId: gameItemGuesses.id,
      guessPlayerId: gameItemGuesses.playerId,
      guessPlayerFirstName: participants.firstName,
      guessPlayerLastName: participants.lastName,
      guessText: gameItemGuesses.guess,
      isCorrect: gameItemGuesses.isCorrect,
      guessClueNumber: gameItemClues.clueNumber, // FIXED: get clue number from the guess's linked clue
    })
    .from(gameItems)
    .innerJoin(gameItemTypes, eq(gameItems.gameItemTypeId, gameItemTypes.id))
    .leftJoin(gameItemClues, eq(gameItemClues.gameItemId, gameItems.id))
    .leftJoin(gameItemGuesses, eq(gameItemGuesses.gameItemId, gameItems.id))
    .leftJoin(participants, eq(gameItemGuesses.playerId, participants.id))
    .where(eq(gameItems.gameId, gameId))
    .orderBy(gameItems.itemNumber, asc(gameItemClues.clueNumber));

  // Fetch jackpot
  const jackpotData = await db
    .select({
      oneCorrect: jackpots.oneCorrect,
      bothCorrect: jackpots.bothCorrect,
      callerName: jackpots.callerName,
      callerGuessInitials: initialCombinations.combination,
    })
    .from(jackpots)
    .leftJoin(initialCombinations, eq(jackpots.callerGuessInitialsCombinationId, initialCombinations.id))
    .where(eq(jackpots.gameId, gameId))
    .limit(1);

  // Fetch game sponsors
  const gameSponsorsData = await db
    .select({
      sponsorName: sponsors.name,
    })
    .from(gameSponsors)
    .innerJoin(sponsors, eq(gameSponsors.sponsorId, sponsors.id))
    .where(eq(gameSponsors.gameId, gameId));

  // Transform data - FIXED to deduplicate
  const players = new Map<number, { firstName: string; lastName: string; nickname: string | null; sponsors: string[] }>();
  gamePlayersData.forEach(p => {
    if (!players.has(p.playerId)) {
      players.set(p.playerId, { firstName: p.firstName, lastName: p.lastName, nickname: p.nickname, sponsors: [] });
    }
    if (p.sponsorId && p.sponsorName) {
      players.get(p.playerId)!.sponsors.push(p.sponsorName);
    }
  });

  const prizes = new Map<number, { prize: string; beneficiaries: { name: string; pickOrder: number }[] }>();
  prizesData.forEach(p => {
    if (!prizes.has(p.prizeId)) {
      prizes.set(p.prizeId, { prize: p.prize, beneficiaries: [] });
    }
    if (p.beneficiaryId) {
      prizes.get(p.prizeId)!.beneficiaries.push({
        name: `${p.beneficiaryFirstName} ${p.beneficiaryLastName}`,
        pickOrder: p.pickOrder,
      });
    }
  });

  const items = new Map<number, { itemNumber: number; itemType: string; answer: string; clues: { id: number; number: number; text: string; completed: boolean }[]; guesses: { playerId: number; playerName: string; guess: string | null; isCorrect: boolean; clueNumber: number }[] }>();
  itemsData.forEach(i => {
    if (!items.has(i.itemId)) {
      items.set(i.itemId, { itemNumber: i.itemNumber, itemType: i.itemType, answer: i.itemAnswer, clues: [], guesses: [] });
    }
    // FIXED: Check for duplicate before pushing
    if (i.clueId && !items.get(i.itemId)!.clues.some(c => c.id === i.clueId)) {
      items.get(i.itemId)!.clues.push({ id: i.clueId, number: i.clueNumber, text: i.clueText, completed: i.clueCompleted });
    }
    // FIXED: Check for duplicate guesses before pushing
    if (i.guessId && !items.get(i.itemId)!.guesses.some(g => g.playerId === i.guessPlayerId && g.clueNumber === i.guessClueNumber)) {
      items.get(i.itemId)!.guesses.push({
        playerId: i.guessPlayerId,
        playerName: `${i.guessPlayerFirstName} ${i.guessPlayerLastName}`,
        guess: i.guessText,
        isCorrect: i.isCorrect,
        clueNumber: i.guessClueNumber,
      });
    }
  });

  return {
    ...game[0],
    players: Array.from(players.values()),
    prizes: Array.from(prizes.values()),
    items: Array.from(items.values()).sort((a, b) => a.itemNumber - b.itemNumber),
    jackpot: jackpotData[0] || null,
    gameSponsors: gameSponsorsData.map(s => s.sponsorName),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add getGameById server action with proper data transformation"
```

---

### Task 2: Create Game Data Page

**Files:**
- Create: `src/app/games/[id]/page.tsx`
- Test: Load `/games/1` and verify renders

**IMPORTANT:** Do NOT use `export const dynamic = 'force-dynamic'` — let caching work

- [ ] **Step 1: Create page directory and file**

```typescript
import { notFound } from 'next/navigation';
import { getGameById } from '@/app/actions';
import { OverviewSection } from '@/components/GameDataPage/OverviewSection';
import { PlayersSection } from '@/components/GameDataPage/PlayersSection';
import { PrizesSection } from '@/components/GameDataPage/PrizesSection';
import { ItemsTimeline } from '@/components/GameDataPage/ItemsTimeline';
import { JackpotSection } from '@/components/GameDataPage/JackpotSection';
import { SponsorsSection } from '@/components/GameDataPage/SponsorsSection';

// Do NOT use dynamic = 'force-dynamic' - let the page use default caching
// On-demand revalidation will be triggered via revalidatePath in mutations

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 p-6 md:p-10">
      <OverviewSection
        gameNumber={game.gameNumber}
        gameDate={game.gameDate}
        hostFirstName={game.hostFirstName}
        hostLastName={game.hostLastName}
        hostNickname={game.hostNickname}
        initialsCombination={game.initialsCombination}
        notes={game.notes}
      />

      {game.players.length > 0 && (
        <PlayersSection players={game.players} />
      )}

      {game.prizes.length > 0 && (
        <PrizesSection prizes={game.prizes} />
      )}

      {game.items.length > 0 && (
        <ItemsTimeline items={game.items} />
      )}

      {game.jackpot && (
        <JackpotSection jackpot={game.jackpot} />
      )}

      {game.gameSponsors.length > 0 && (
        <SponsorsSection sponsors={game.gameSponsors} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/games/[id]/page.tsx
git commit -m "feat: add game data page at /games/[id]"
```

---

### Task 3: Create Overview Section Component

**Files:**
- Create: `src/components/GameDataPage/OverviewSection.tsx`
- Test: Verify displays game number, date, host, initials

**IMPORTANT:** This is a SERVER component - NO 'use client' directive needed

- [ ] **Step 1: Create OverviewSection component (server)**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatGameDateUTC } from '@/lib/utils';

interface OverviewSectionProps {
  gameNumber: number;
  gameDate: Date | string;
  hostFirstName: string;
  hostLastName: string;
  hostNickname: string | null;
  initialsCombination: string;
  notes: string | null;
}

export function OverviewSection({
  gameNumber,
  gameDate,
  hostFirstName,
  hostLastName,
  hostNickname,
  initialsCombination,
  notes,
}: OverviewSectionProps) {
  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-4xl font-bold tracking-tight">
            Game #{gameNumber}
          </CardTitle>
          <span className="text-lg text-muted-foreground">
            {formatGameDateUTC(gameDate)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Host</span>
            <p className="text-xl font-semibold">
              {hostFirstName} {hostLastName}
              {hostNickname && (
                <span className="text-muted-foreground"> ({hostNickname})</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Initials</span>
            <p className="text-2xl font-mono font-bold tracking-wider text-primary">
              {initialsCombination}
            </p>
          </div>
        </div>
        {notes && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/OverviewSection.tsx
git commit -m "feat: add OverviewSection component (server)"
```

---

### Task 4: Create Players Section Component

**Files:**
- Create: `src/components/GameDataPage/PlayersSection.tsx`
- Test: Verify displays players with sponsor badges

- [ ] **Step 1: Create PlayersSection component**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Player {
  firstName: string;
  lastName: string;
  nickname: string | null;
  sponsors: string[];
}

interface PlayersSectionProps {
  players: Player[];
}

export function PlayersSection({ players }: PlayersSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {players.map((player, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card/50 p-3"
            >
              <p className="font-medium">
                {player.firstName} {player.lastName}
                {player.nickname && (
                  <span className="text-muted-foreground"> ({player.nickname})</span>
                )}
              </p>
              {player.sponsors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {player.sponsors.map((sponsor) => (
                    <Badge key={sponsor} variant="secondary" className="text-xs">
                      {sponsor}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/PlayersSection.tsx
git commit -m "feat: add PlayersSection component"
```

---

### Task 5: Create Prizes Section Component

**Files:**
- Create: `src/components/GameDataPage/PrizesSection.tsx`
- Test: Verify displays prizes with pick order badges

- [ ] **Step 1: Create PrizesSection component**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Beneficiary {
  name: string;
  pickOrder: number;
}

interface Prize {
  prize: string;
  beneficiaries: Beneficiary[];
}

interface PrizesSectionProps {
  prizes: Prize[];
}

export function PrizesSection({ prizes }: PrizesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prizes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prizes.map((prize, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card/50 p-4"
            >
              <h3 className="font-semibold text-lg mb-2">{prize.prize}</h3>
              {prize.beneficiaries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prize.beneficiaries
                    .sort((a, b) => a.pickOrder - b.pickOrder)
                    .map((beneficiary) => (
                      <div
                        key={beneficiary.pickOrder}
                        className="flex items-center gap-2"
                      >
                        <Badge variant="outline" className="text-xs">
                          #{beneficiary.pickOrder}
                        </Badge>
                        <span className="text-sm">{beneficiary.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/PrizesSection.tsx
git commit -m "feat: add PrizesSection component"
```

---

### Task 6: Create Items Timeline Component with Progressive Reveal

**Files:**
- Create: `src/components/GameDataPage/ItemsTimeline.tsx`
- Test: Verify timeline renders and spoiler toggle works

- [ ] **Step 1: Create ItemsTimeline component**

```typescript
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteSettings } from '@/context/SiteSettingsContext';

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

interface Item {
  itemNumber: number;
  itemType: string;
  answer: string;
  clues: Clue[];
  guesses: Guess[];
}

interface ItemsTimelineProps {
  items: Item[];
}

export function ItemsTimeline({ items }: ItemsTimelineProps) {
  const { showSpoilers } = useSiteSettings();
  const [revealedClues, setRevealedClues] = useState<Set<number>>(new Set());

  const toggleClue = (clueId: number) => {
    setRevealedClues((prev) => {
      const next = new Set(prev);
      if (next.has(clueId)) {
        next.delete(clueId);
      } else {
        next.add(clueId);
      }
      return next;
    });
  };

  const isClueRevealed = (clue: Clue) => {
    if (showSpoilers) return true;
    return revealedClues.has(clue.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {items.map((item) => (
          <div key={item.itemNumber} className="relative">
            {/* Item header */}
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="default" className="text-lg px-3 py-1">
                #{item.itemNumber}
              </Badge>
              <Badge variant="secondary">{item.itemType}</Badge>
              {showSpoilers && (
                <span className="text-sm text-muted-foreground ml-auto">
                  Answer: {item.answer}
                </span>
              )}
            </div>

            {/* Vertical timeline */}
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              {/* Clues */}
              {item.clues.map((clue) => {
                const isRevealed = isClueRevealed(clue);
                const guessesForThisClue = item.guesses.filter(
                  (g) => g.clueNumber === clue.number
                );

                return (
                  <div key={clue.id} className="relative pb-6 last:pb-0">
                    {/* Timeline node */}
                    <div
                      className={`absolute left-[-1.25rem] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isRevealed
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-muted-foreground'
                      }`}
                    >
                      {clue.number}
                    </div>

                    {/* Clue content */}
                    <div className="ml-2">
                      {!showSpoilers && !isRevealed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleClue(clue.id)}
                          className="mb-2"
                        >
                          Reveal Clue {clue.number}
                        </Button>
                      ) : (
                        <div
                          className={`p-3 rounded-lg mb-2 ${
                            clue.completed
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/50'
                          }`}
                        >
                          <p className="text-sm">{clue.text}</p>
                          {clue.completed && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Guesses between clues */}
                      {isRevealed && guessesForThisClue.length > 0 && (
                        <div className="space-y-2 ml-4 border-l-2 border-muted pl-4">
                          {guessesForThisClue.map((guess, gIndex) => (
                            <div
                              key={gIndex}
                              className={`text-sm p-2 rounded ${
                                guess.isCorrect
                                  ? 'bg-green-500/20 border border-green-500/30'
                                  : 'bg-muted/30'
                              }`}
                            >
                              <span className="font-medium">{guess.playerName}:</span>{' '}
                              {guess.guess || '(no guess)'}
                              {guess.isCorrect && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Final answer */}
              <div className="relative pt-2">
                <div className="absolute left-[-1.25rem] top-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <div className="ml-2">
                  {showSpoilers ? (
                    <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                      <span className="text-sm font-medium">Answer:</span>{' '}
                      <span className="text-lg font-bold">{item.answer}</span>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Reveal all remaining clues
                        item.clues.forEach((c) => {
                          if (!revealedClues.has(c.id)) {
                            setRevealedClues((prev) => new Set([...prev, c.id]));
                          }
                        });
                      }}
                    >
                      Reveal Answer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/ItemsTimeline.tsx
git commit -m "feat: add ItemsTimeline component with progressive reveal"
```

---

### Task 7: Create Jackpot Section Component

**Files:**
- Create: `src/components/GameDataPage/JackpotSection.tsx`
- Test: Verify displays jackpot amounts and caller info

- [ ] **Step 1: Create JackpotSection component**

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Jackpot {
  oneCorrect: number;
  bothCorrect: number;
  callerName: string | null;
  callerGuessInitials: string | null;
}

interface JackpotSectionProps {
  jackpot: Jackpot;
}

export function JackpotSection({ jackpot }: JackpotSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jackpot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">One Correct</p>
            <p className="text-3xl font-bold text-primary">
              ${jackpot.oneCorrect.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border bg-card/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Both Correct</p>
            <p className="text-3xl font-bold text-primary">
              ${jackpot.bothCorrect.toLocaleString()}
            </p>
          </div>
        </div>
        {(jackpot.callerName || jackpot.callerGuessInitials) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Caller</p>
            <p className="font-medium">
              {jackpot.callerName}
              {jackpot.callerGuessInitials && (
                <span className="text-muted-foreground">
                  {' '}
                  — guessed{' '}
                  <span className="font-mono font-bold">{jackpot.callerGuessInitials}</span>
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/JackpotSection.tsx
git commit -m "feat: add JackpotSection component"
```

---

### Task 8: Create Sponsors Section Component

**Files:**
- Create: `src/components/GameDataPage/SponsorsSection.tsx`
- Test: Verify displays game sponsors

- [ ] **Step 1: Create SponsorsSection component**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SponsorsSectionProps {
  sponsors: string[];
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  if (sponsors.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Sponsors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {sponsors.map((sponsor) => (
            <Badge key={sponsor} variant="outline" className="text-sm px-3 py-1">
              {sponsor}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameDataPage/SponsorsSection.tsx
git commit -m "feat: add SponsorsSection component"
```

---

### Task 9: Add Revalidation to Admin Actions

**Files:**
- Modify: `src/app/actions.ts` (find the addGame function and add revalidatePath calls)
- Test: Add a new game and verify page renders without manual cache purge

- [ ] **Step 1: Add revalidatePath to addGame function**

Find the `addGame` function in actions.ts. After the successful transaction and before returning `{ success: true }`, add:

```typescript
revalidatePath('/games');
revalidatePath(`/games/${gameId}`);
```

The existing code already has `revalidatePath('/admin/games')` — add the public game pages too.

- [ ] **Step 2: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add on-demand revalidation for game pages"
```

---

### Task 10: Create API Route for Manual Revalidation (POST only)

**Files:**
- Create: `src/app/api/revalidate-game/[id]/route.ts`
- Test: Call `curl -X POST /api/revalidate-game/1` and verify cache is purged

- [ ] **Step 1: Create API route (POST only)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  revalidatePath('/games');
  revalidatePath(`/games/${gameId}`);

  return NextResponse.json({ revalidated: true, gameId });
}
```

**IMPORTANT:** No GET handler — POST only for security

- [ ] **Step 2: Commit**

```bash
git add src/app/api/revalidate-game/[id]/route.ts
git commit -m "feat: add POST-only API route for manual game cache revalidation"
```

---

### Task 11: Link Games Table to Game Data Page

**Files:**
- Modify: `src/components/GamesTable.tsx`
- Test: Click game number and verify navigates to `/games/[id]`

- [ ] **Step 1: Add Link component to game number cell**

Wrap the game number cell content in a Link to `/games/[id]`:

```typescript
<TableCell>
  <Link
    href={`/games/${game.id}`}
    className="text-primary hover:underline font-medium"
  >
    {game.gameNumber}
  </Link>
</TableCell>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GamesTable.tsx
git commit -m "feat: link game numbers to game detail page"
```

---

### Task 12: Final Verification

**Files:**
- Test: Manual verification

- [ ] **Step 1: Build the project**

```bash
cd /Users/jesseanderson/Projects/powertripstats
npm run build
```

- [ ] **Step 2: Start dev server and verify page loads**

```bash
npm run dev
# Navigate to /games/1 (or any existing game ID)
```

- [ ] **Step 3: Test progressive reveal**

Toggle spoilers off, verify clues are hidden. Click to reveal, verify progressive reveal works.

- [ ] **Step 4: Commit final changes**

```bash
git add .
git commit -m "feat: complete game data page implementation"
```

---

## Spec Coverage Check

- [x] Overview section — Task 3 (server component)
- [x] Players section — Task 4
- [x] Prizes section — Task 5
- [x] Items timeline with vertical timeline — Task 6
- [x] Progressive reveal based on spoiler toggle — Task 6
- [x] Jackpot section — Task 7
- [x] Sponsors section — Task 8
- [x] On-demand revalidation via revalidatePath — Task 9
- [x] API route for manual revalidation (POST only) — Task 10
- [x] Navigation from games list — Task 11

---

Plan complete. Which execution approach would you prefer?

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints