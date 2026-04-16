import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GamesTable } from '@/components/GamesTable';
import { getDb } from '@/db/client';

import { getGames, getTotalGames } from '../actions';

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

  const [gamesData, totalResult] = db
    ? await Promise.all([getGames(LIMIT, offset), getTotalGames()])
    : [[], [{ total: 0 }]];

  const total = totalResult[0].total;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Games</h1>

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

          <GamesTable games={gamesData ?? []} page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </main>
  );
}
