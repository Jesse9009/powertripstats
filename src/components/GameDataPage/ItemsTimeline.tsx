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
