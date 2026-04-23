'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  gameNumber: number;
  videoUrl: string | null;
  audioUrl: string | null;
}

export function WatchAndListen({ gameNumber, videoUrl, audioUrl }: Props) {
  const [open, setOpen] = useState(true);

  if (!videoUrl && !audioUrl) return null;

  const title =
    videoUrl && audioUrl
      ? 'Watch and Listen'
      : videoUrl
        ? 'Watch'
        : 'Listen';

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none px-4 py-3"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </CardHeader>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {videoUrl && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={videoUrl}
                title={`Initials Game ${gameNumber}`}
                className="absolute inset-0 h-full w-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {audioUrl && (
            <iframe
              src={audioUrl}
              title="Game audio"
              className="w-full rounded"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          )}
        </div>
      )}
    </Card>
  );
}
