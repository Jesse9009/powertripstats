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
import { formatFullName } from '@/lib/utils';
import { getParticipants } from './actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getParticipants();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle>PowerTripStats starter</CardTitle>
          <CardDescription>
            Next.js App Router + Tailwind + shadcn/ui + Drizzle ORM + Turso
            libSQL
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            Rows from the starter `participants` table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
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
                    No rows yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.id}</TableCell>
                    <TableCell>
                      {formatFullName(participant.firstName, participant.middleName, participant.lastName)}
                    </TableCell>
                    <TableCell>{participant.nickname}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
