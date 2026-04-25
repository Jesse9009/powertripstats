'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { formatGameDateUTC } from '@/lib/utils';

type GameRow = {
  id: number;
  gameNumber: number;
  gameDate: Date | string;
  hostFirstName: string;
  hostLastName: string;
  hostNickname: string | null;
  initialsCombination: string;
  players: string | null;
  winner: string | null;
};

interface GamesTableProps {
  games: GameRow[];
  page: number;
  totalPages: number;
}

export function GamesTable({ games, page, totalPages }: GamesTableProps) {
  const { showSpoilers } = useSiteSettings();

  const getPeople = (value: string | null) => {
    if (!value) {
      return [];
    }

    return value
      .split(', ')
      .map((name) => name.trim())
      .filter(Boolean);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Game Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Initials</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Winner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No games yet.
              </TableCell>
            </TableRow>
          ) : (
            games.map((game) => (
              <TableRow key={game.id}>
                <TableCell>
                  <Link
                    href={`/games/${game.gameNumber}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {game.gameNumber}
                  </Link>
                </TableCell>
                <TableCell>{formatGameDateUTC(game.gameDate)}</TableCell>
                <TableCell>{game.initialsCombination}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {game.hostFirstName} {game.hostLastName}
                    {game.hostNickname ? ` (${game.hostNickname})` : ''}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getPeople(game.players).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getPeople(game.players).map((player) => (
                        <Badge key={player} variant="secondary">
                          {player}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {!showSpoilers ? (
                    <Badge variant="outline">SPOILERS!</Badge>
                  ) : getPeople(game.winner).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getPeople(game.winner).map((winner) => (
                        <Badge key={winner}>{winner}</Badge>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild disabled={page <= 1}>
            <Link href={`/games?page=${page - 1}`}>Previous</Link>
          </Button>
          <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
            <Link href={`/games?page=${page + 1}`}>Next</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
