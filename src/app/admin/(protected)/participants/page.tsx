import Link from 'next/link';

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

import { AddParticipantForm } from '@/components/AddParticipantForm';
import { getParticipants, getTotalParticipants } from '@/app/actions';

export const dynamic = 'force-dynamic';

const LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ParticipantsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const offset = (page - 1) * LIMIT;

  const db = getDb();

  const [data, totalResult] = db
    ? await Promise.all([
        getParticipants(LIMIT, offset),
        getTotalParticipants(),
      ])
    : [[], [{ total: 0 }]];

  const total = totalResult[0].total;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Participants</h1>

      <div className="flex items-start gap-6">
        {/* Table card */}
        <Card className="min-w-0 flex-1">
          <CardHeader>
            <CardTitle>All Participants</CardTitle>
            <CardDescription>
              {total} participant{total !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!db && (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Database env vars are not set. Copy{' '}
                <code>.env.local.example</code> to <code>.env.local</code>, add
                your Turso credentials, run migrations, then refresh.
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Nickname</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No participants yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">
                        {p.id}
                      </TableCell>
                      <TableCell>{p.firstName}</TableCell>
                      <TableCell>{p.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.nickname ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page <= 1}
                >
                  <Link href={`/admin/participants?page=${page - 1}`}>Previous</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page >= totalPages}
                >
                  <Link href={`/admin/participants?page=${page + 1}`}>Next</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add participant form */}
        <AddParticipantForm />
      </div>
    </main>
  );
}