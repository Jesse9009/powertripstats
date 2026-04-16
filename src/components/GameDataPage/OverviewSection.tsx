import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatGameDateUTC } from '@/lib/utils';

interface OverviewSectionProps {
  gameNumber: number;
  gameDate: Date | string;
  hostFirstName: string;
  hostLastName: string;
  hostNickname: string | null;
  initialsCombination: string;
  notes: string | null;
}

export function OverviewSection({
  gameNumber,
  gameDate,
  hostFirstName,
  hostLastName,
  hostNickname,
  initialsCombination,
  notes,
}: OverviewSectionProps) {
  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-4xl font-bold tracking-tight">
            Game #{gameNumber}
          </CardTitle>
          <span className="text-lg text-muted-foreground">
            {formatGameDateUTC(gameDate)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Host</span>
            <p className="text-xl font-semibold">
              {hostFirstName} {hostLastName}
              {hostNickname && (
                <span className="text-muted-foreground"> ({hostNickname})</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Initials</span>
            <p className="text-2xl font-mono font-bold tracking-wider text-primary">
              {initialsCombination}
            </p>
          </div>
        </div>
        {notes && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
