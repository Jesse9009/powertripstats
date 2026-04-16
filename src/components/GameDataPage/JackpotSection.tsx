'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Jackpot {
  oneCorrect: number;
  bothCorrect: number;
  callerName: string | null;
  callerGuessInitials: string | null;
}

interface JackpotSectionProps {
  jackpot: Jackpot;
}

export function JackpotSection({ jackpot }: JackpotSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jackpot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">One Correct</p>
            <p className="text-3xl font-bold text-primary">
              ${jackpot.oneCorrect.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border bg-card/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Both Correct</p>
            <p className="text-3xl font-bold text-primary">
              ${jackpot.bothCorrect.toLocaleString()}
            </p>
          </div>
        </div>
        {(jackpot.callerName || jackpot.callerGuessInitials) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Caller</p>
            <p className="font-medium">
              {jackpot.callerName}
              {jackpot.callerGuessInitials && (
                <span className="text-muted-foreground">
                  {' '}
                  — guessed{' '}
                  <span className="font-mono font-bold">{jackpot.callerGuessInitials}</span>
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
