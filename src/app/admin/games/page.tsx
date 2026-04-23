import Link from 'next/link';

import { AddGameForm } from '@/components/AddGameForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDb } from '@/db/client';
import { formatGameDateUTC } from '@/lib/utils';

import { getGameFormOptions, getGames, getTotalGames } from '../../actions';

export const dynamic = 'force-dynamic';

const LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function GamesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const offset = (page - 1) * LIMIT;

  const db = getDb();

  const [gamesData, totalResult, options] = db
    ? await Promise.all([
        getGames(LIMIT, offset),
        getTotalGames(),
        getGameFormOptions(),
      ])
    : [
        [],
        [{ total: 0 }],
        {
          participants: [],
          gameTypes: [],
          gameItemTypes: [],
          sponsors: [],
          locations: [],
        },
      ];

  const total = totalResult[0].total;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Games</h1>

      <AddGameForm
        participants={options.participants}
        gameTypes={options.gameTypes}
        gameItemTypes={options.gameItemTypes}
        sponsors={options.sponsors}
        locations={options.locations}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
          <CardDescription>
            {total} game{total !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!db && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Database env vars are not set. Copy <code>.env.local.example</code> to <code>.env.local</code>, add
              your Turso credentials, run migrations, then refresh.
            </p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Game #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Initials</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gamesData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No games yet.
                  </TableCell>
                </TableRow>
              ) : (
                gamesData?.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="text-muted-foreground">{game.id}</TableCell>
                    <TableCell>{game.gameNumber}</TableCell>
                    <TableCell>{formatGameDateUTC(game.gameDate)}</TableCell>
                    <TableCell>
                      {game.hostFirstName} {game.hostLastName}
                      {game.hostNickname ? ` (${game.hostNickname})` : ''}
                    </TableCell>
                    <TableCell>{game.initialsCombination}</TableCell>
                    <TableCell>
                      {game.winner ? game.winner : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/games/${game.id}/edit`}>Edit</Link>
                      </Button>
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
                <Link href={`/admin/games?page=${page - 1}`}>Previous</Link>
              </Button>
              <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
                <Link href={`/admin/games?page=${page + 1}`}>Next</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
