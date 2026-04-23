'use client';

import { EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatGameDateUTC } from '@/lib/utils';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import {
  computeScores,
  fullName,
  getOverallWinner,
  shortName,
  type ItemData,
  type PlayerLike,
} from './deriveGameState';

interface Beneficiary {
  name: string;
  pickOrder: number;
}

interface Prize {
  prize: string;
  beneficiaries: Beneficiary[];
}

interface Player extends PlayerLike {
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
  items: ItemData[];
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
  items,
}: GameHeaderProps) {
  const { showSpoilers } = useSiteSettings();
  const scores = computeScores(items, players);
  const winner = getOverallWinner(scores);
  const playersByName = new Map(players.map((p) => [fullName(p), p]));

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          <InitialsBadge initials={initialsCombination} />
          <div className="flex-1 min-w-0 space-y-1">
            <h1 className="font-display text-5xl leading-none tracking-wide">
              Game #{gameNumber}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{formatGameDateUTC(gameDate)}</span>
              <span>
                Host:{' '}
                <span className="text-foreground font-medium">
                  {hostFirstName} {hostLastName}
                </span>
                {hostNickname && <span> ({hostNickname})</span>}
              </span>
              {locationName && (
                <span>
                  Location:{' '}
                  <span className="text-foreground font-medium">
                    {locationName}
                  </span>
                </span>
              )}
            </div>
            <div className="pt-2">
              <WinnerPill
                showSpoilers={showSpoilers}
                winner={winner}
                playersByName={playersByName}
              />
            </div>
          </div>

          {players.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Players
              </span>
              {players.map((p) => {
                const name = fullName(p);
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.nickname && (
                      <span className="text-muted-foreground">
                        &ldquo;{p.nickname}&rdquo;
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {gameSponsors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Sponsors:</span>
            {gameSponsors.map((sponsor) => (
              <Badge key={sponsor} variant="outline" className="text-xs">
                {sponsor}
              </Badge>
            ))}
          </div>
        )}

        {players.some((p) => p.sponsors.length > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {players
              .filter((p) => p.sponsors.length > 0)
              .map((p) => (
                <div key={`sponsors-${fullName(p)}`}>
                  <span className="font-medium text-foreground">
                    {shortName(p)}:
                  </span>{' '}
                  {p.sponsors.join(', ')}
                </div>
              ))}
          </div>
        )}

        {jackpot && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">
                Jackpot (1 correct):{' '}
              </span>
              <span className="font-bold text-primary">
                ${jackpot.oneCorrect.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Jackpot (both correct):{' '}
              </span>
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
                      {' '}
                      &mdash; guessed{' '}
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

        {prizes.length > 0 && <PrizesDisclosure prizes={prizes} />}

        {notes && (
          <div className="rounded-lg bg-muted/50 p-3 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InitialsBadge({ initials }: { initials: string }) {
  return (
    <div
      className="font-display text-5xl px-4 py-2 rounded-lg bg-primary/10 text-primary tracking-[0.3em] shrink-0"
      aria-label={`Initials ${initials}`}
    >
      {initials.split('').join(' ')}
    </div>
  );
}

function WinnerPill({
  showSpoilers,
  winner,
  playersByName,
}: {
  showSpoilers: boolean;
  winner: ReturnType<typeof getOverallWinner>;
  playersByName: Map<string, PlayerLike>;
}) {
  if (!showSpoilers) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
        <EyeOff className="h-3 w-3" />
        Result hidden
      </span>
    );
  }
  if (winner.kind === 'tie') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-semibold">
        Tied game
      </span>
    );
  }
  if (winner.kind === 'none' || !winner.name) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
        No winner
      </span>
    );
  }
  const player = playersByName.get(winner.name);
  const display = player ? shortName(player) : winner.name;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {display} wins
    </span>
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
          <div key={`${prize.prize}-${index}`}>
            <span className="font-medium">{prize.prize}</span>
            {prize.beneficiaries.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                &mdash;{' '}
                {prize.beneficiaries
                  .slice()
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
