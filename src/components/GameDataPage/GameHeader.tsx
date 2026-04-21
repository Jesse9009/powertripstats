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

        {players.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {players.map((player, index) => (
              <div key={`${player.firstName}-${player.lastName}`} className="flex flex-col items-center">
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
                {' '}&mdash;{' '}
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
