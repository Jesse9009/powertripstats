'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  deriveItemState,
  fullName,
  type ItemData,
  type PlayerLike,
} from './deriveGameState';
import { GuessAnnotation } from './GuessAnnotation';

const TIEBREAKER_TYPE = 'tiebreaker';

interface PlayAlongItemCardProps {
  item: ItemData;
  players: PlayerLike[];
}

export function PlayAlongItemCard({ item, players }: PlayAlongItemCardProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const state = deriveItemState(item);
  const isTiebreaker = item.itemType.toLowerCase() === TIEBREAKER_TYPE;
  const playersByName = new Map(players.map((p) => [fullName(p), p]));

  const totalClues = item.clues.length;
  const allCluesRevealed = revealedCount >= totalClues;
  const visibleClues = item.clues.slice(0, revealedCount);

  const reset = () => {
    setRevealedCount(0);
    setAnswerShown(false);
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-muted-foreground w-8 shrink-0">
            {item.itemNumber}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {isTiebreaker && (
              <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                Tiebreaker
              </Badge>
            )}
            {!answerShown && (
              <span className="font-display text-2xl text-muted-foreground tracking-[0.4em]">
                ? ? ?
              </span>
            )}
            {!answerShown && (
              <span className="text-xs text-muted-foreground">
                {totalClues} clue{totalClues === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {visibleClues.length > 0 && (
          <div className="space-y-2">
            {visibleClues.map((clue) => {
              const guesses = answerShown
                ? state.guessesByClue.get(clue.number) ?? []
                : [];
              return (
                <div
                  key={clue.id}
                  className="rounded-lg border bg-muted/30 p-3"
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

        {answerShown && (
          <div
            className={cn(
              'rounded-lg border p-3',
              state.nobody
                ? 'bg-[color:hsl(var(--nobody-bg))] border-[color:hsl(var(--nobody))]'
                : 'bg-[color:hsl(var(--win-bg))] border-[color:hsl(var(--win))]',
            )}
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Answer
            </span>
            <div
              className={cn(
                'font-display text-2xl',
                state.nobody && 'text-[color:hsl(var(--nobody))]',
              )}
            >
              {item.answer}
            </div>
            {state.nobody && (
              <span className="text-xs text-muted-foreground italic">
                No correct guess this round.
              </span>
            )}
          </div>
        )}

        {!answerShown ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (revealedCount === 0) {
                setRevealedCount(1);
              } else if (!allCluesRevealed) {
                setRevealedCount((n) => n + 1);
              } else {
                setAnswerShown(true);
              }
            }}
            className="w-full"
          >
            {revealedCount === 0
              ? 'Reveal Clue 1'
              : allCluesRevealed
                ? 'Reveal Answer'
                : `Next Clue (${revealedCount + 1}/${totalClues})`}
          </Button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground underline self-start"
          >
            Reset
          </button>
        )}
      </CardContent>
    </Card>
  );
}
