'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Beneficiary {
  name: string;
  pickOrder: number;
}

interface Prize {
  prize: string;
  beneficiaries: Beneficiary[];
}

interface PrizesSectionProps {
  prizes: Prize[];
}

export function PrizesSection({ prizes }: PrizesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prizes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prizes.map((prize, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card/50 p-4"
            >
              <h3 className="font-semibold text-lg mb-2">{prize.prize}</h3>
              {prize.beneficiaries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prize.beneficiaries
                    .sort((a, b) => a.pickOrder - b.pickOrder)
                    .map((beneficiary) => (
                      <div
                        key={beneficiary.pickOrder}
                        className="flex items-center gap-2"
                      >
                        <Badge variant="outline" className="text-xs">
                          #{beneficiary.pickOrder}
                        </Badge>
                        <span className="text-sm">{beneficiary.name}</span>
                      </div>
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
