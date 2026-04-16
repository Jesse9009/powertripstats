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
