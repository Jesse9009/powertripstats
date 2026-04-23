'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  deriveItemState,
  fullName,
  shortName,
  type ItemData,
  type PlayerLike,
} from './deriveGameState';
import { GuessAnnotation } from './GuessAnnotation';

const TIEBREAKER_TYPE = 'tiebreaker';

interface SpoilerItemCardProps {
  item: ItemData;
  players: PlayerLike[];
}

export function SpoilerItemCard({ item, players }: SpoilerItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const state = deriveItemState(item);
  const isTiebreaker = item.itemType.toLowerCase() === TIEBREAKER_TYPE;

  const playersByName = new Map(players.map((p) => [fullName(p), p]));
  const winnerPlayer = state.winnerGuess
    ? playersByName.get(state.winnerGuess.playerName)
    : undefined;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <CardContent className="flex items-center gap-4 p-4">
          <span className="font-display text-3xl text-muted-foreground w-8 shrink-0">
            {item.itemNumber}
          </span>

          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isTiebreaker && (
                <Badge
                  variant="destructive"
                  className="text-[10px] uppercase tracking-wide"
                >
                  Tiebreaker
                </Badge>
              )}
              <span
                className={cn(
                  'font-semibold text-lg truncate',
                  state.nobody && 'text-[color:hsl(var(--nobody))]',
                )}
              >
                {item.answer}
              </span>
              {state.nobody && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wide"
                  style={{
                    backgroundColor: 'hsl(var(--nobody-bg))',
                    borderColor: 'hsl(var(--nobody))',
                    color: 'hsl(var(--nobody))',
                  }}
                >
                  Nobody got it ("YOU BLEW IT!")
                </Badge>
              )}
            </div>

            <CluePipStrip state={state} totalClues={isTiebreaker ? 3 : 6} />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {state.eliminatedPlayerNames
              .filter((n) => n !== state.winnerGuess?.playerName)
              .map((name) => {
                const p = playersByName.get(name);
                return (
                  <EliminatedPill
                    key={name}
                    display={p ? shortName(p) : name}
                  />
                );
              })}
            {winnerPlayer && state.winnerGuess && (
              <WinnerPill name={shortName(winnerPlayer)} />
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/30">
          {item.clues.map((clue) => {
            // sort guesses so that incorrect guesses are always shown to the left of the correct guesses
            const guesses =
              state.guessesByClue.get(clue.number)?.sort((a, b) => {
                if (a.isCorrect && !b.isCorrect) return 1;
                if (!a.isCorrect && b.isCorrect) return -1;
                return 0;
              }) ?? [];
            const isWinClue =
              state.finalReadClueNumber === clue.number &&
              state.winnerGuess !== null;
            const isPastWin =
              state.finalReadClueNumber !== null &&
              clue.number > state.finalReadClueNumber;

            return (
              <div
                key={clue.id}
                className={cn(
                  'rounded-lg border p-3',
                  isWinClue &&
                    'border-[color:hsl(var(--win))] bg-[color:hsl(var(--win-bg))]',
                  !isWinClue && !isPastWin && 'bg-background',
                  isPastWin && 'opacity-50',
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="font-display text-xl text-muted-foreground w-6 shrink-0">
                    {clue.number}
                  </span>
                  <p className="text-sm flex-1">{clue.text}</p>
                </div>
                {guesses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                    {guesses.map((g) => (
                      <GuessAnnotation
                        key={`${g.playerId}-${g.clueNumber}-${g.isCorrect}`}
                        guess={g}
                        player={playersByName.get(g.playerName)}
                        answer={item.answer}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CluePipStrip({
  state,
  totalClues,
}: {
  state: ReturnType<typeof deriveItemState>;
  totalClues: number;
}) {
  const pips = Array.from({ length: totalClues }, (_, i) => i + 1);
  return (
    <div className="w-100 max-w-full">
      <div className="flex gap-1">
        {pips.map((n) => {
          const hasCorrect =
            state.finalReadClueNumber === n && state.winnerGuess !== null;
          const hasWrong = (state.guessesByClue.get(n) ?? []).some(
            (g) => !g.isCorrect,
          );
          const isPastWin =
            state.finalReadClueNumber !== null && n > state.finalReadClueNumber;
          const hasBoth = hasCorrect && hasWrong;

          return (
            <span
              key={n}
              className={cn(
                'h-1.5 flex-1 min-w-4 rounded-full',
                hasCorrect && !hasBoth && 'bg-[color:hsl(var(--win))]',
                !hasCorrect && hasWrong && 'bg-destructive',
                !hasCorrect && !hasWrong && !isPastWin && 'bg-muted',
                isPastWin && !hasWrong && 'bg-muted/40',
              )}
              style={
                hasBoth
                  ? {
                      background:
                        'linear-gradient(to right, hsl(var(--destructive)) 50%, hsl(var(--win)) 50%)',
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function WinnerPill({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: 'hsl(var(--win-bg))',
        borderColor: 'hsl(var(--win))',
        color: 'hsl(var(--win))',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: 'hsl(var(--win))' }}
      />
      {name}
    </span>
  );
}

function EliminatedPill({ display }: { display: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground bg-destructive/50">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive/50" />
      {display}
    </span>
  );
}
