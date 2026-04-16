'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SponsorsSectionProps {
  sponsors: string[];
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  if (sponsors.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Sponsors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {sponsors.map((sponsor) => (
            <Badge key={sponsor} variant="outline" className="text-sm px-3 py-1">
              {sponsor}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
