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

        {answerRevealed && (
          <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-sm font-medium">Answer: </span>
            <span className="font-bold">{item.answer}</span>
          </div>
        )}

        {answerRevealed && item.guesses.length > 0 && (
          <div className="space-y-1">
            {item.guesses.map((guess) => (
              <div
                key={`${guess.playerId}-${guess.clueNumber}`}
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
