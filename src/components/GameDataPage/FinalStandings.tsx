'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import {
  computeScores,
  fullName,
  getOverallWinner,
  type ItemData,
  type PlayerLike,
} from './deriveGameState';

interface FinalStandingsProps {
  items: ItemData[];
  players: PlayerLike[];
}

export function FinalStandings({ items, players }: FinalStandingsProps) {
  const { showSpoilers } = useSiteSettings();
  const [revealed, setRevealed] = useState(false);
  const visible = showSpoilers || revealed;

  const scores = computeScores(items, players);
  const winner = getOverallWinner(scores);
  const sorted = [...players].sort(
    (a, b) => (scores.get(fullName(b)) ?? 0) - (scores.get(fullName(a)) ?? 0),
  );

  const gridCols =
    sorted.length >= 5
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
      : sorted.length === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : sorted.length === 3
          ? 'grid-cols-3'
          : sorted.length === 2
            ? 'grid-cols-2'
            : 'grid-cols-1';

  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl tracking-wide">Final Standings</h2>
      {!visible ? (
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Final standings are hidden in play-along mode.
            </p>
            <Button variant="outline" onClick={() => setRevealed(true)}>
              Reveal Final Standings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn('grid gap-3', gridCols)}>
          {sorted.map((p) => {
            const name = fullName(p);
            const score = scores.get(name) ?? 0;
            const isWinner = winner.kind === 'winner' && winner.name === name;
            return (
              <Card
                key={name}
                className={cn(
                  'overflow-hidden',
                  isWinner && 'border-primary ring-2 ring-primary/50',
                )}
              >
                <CardContent className="p-4 flex flex-col items-center gap-1 text-center">
                  <span className="font-medium text-sm">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className={cn('text-xs text-muted-foreground', !p.nickname && 'invisible')}>
                    {p.nickname ? `“${p.nickname}”` : ' '}
                  </span>
                  <span
                    className={cn(
                      'font-display text-5xl leading-none mt-1',
                      isWinner && 'text-primary',
                    )}
                  >
                    {score}
                  </span>
                  {isWinner && (
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-primary mt-1">
                      Winner
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
