'use client';

import { Check, X } from 'lucide-react';
import { shortName, type Guess, type PlayerLike } from './deriveGameState';

interface GuessAnnotationProps {
  guess: Guess;
  player: PlayerLike | undefined;
  answer: string;
}

export function GuessAnnotation({ guess, player, answer }: GuessAnnotationProps) {
  const display = player ? shortName(player) : guess.playerName;
  const isCorrect = guess.isCorrect;

  const text = isCorrect
    ? guess.guess ?? answer
    : guess.guess ?? null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
        style={{
          backgroundColor: isCorrect ? 'hsl(var(--win))' : 'hsl(var(--destructive))',
          color: isCorrect ? 'hsl(var(--win-foreground))' : 'hsl(var(--destructive-foreground))',
        }}
      >
        {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className="font-medium">
        {display}
      </span>
      {text ? (
        <span className="text-muted-foreground">&mdash; &ldquo;{text}&rdquo;</span>
      ) : (
        <span className="text-muted-foreground italic">&mdash; rang in, no answer</span>
      )}
    </div>
  );
}
