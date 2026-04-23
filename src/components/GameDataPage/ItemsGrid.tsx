'use client';

import { EyeOff } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { SpoilerItemCard } from './SpoilerItemCard';
import { PlayAlongItemCard } from './PlayAlongItemCard';
import type { ItemData, PlayerLike } from './deriveGameState';

interface ItemsGridProps {
  items: ItemData[];
  players: PlayerLike[];
}

export function ItemsGrid({ items, players }: ItemsGridProps) {
  const { showSpoilers } = useSiteSettings();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide">
          {items.length} Item{items.length === 1 ? '' : 's'}
        </h2>
      </div>

      {!showSpoilers && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <EyeOff className="h-3.5 w-3.5" />
          Answers and outcomes are hidden. Reveal clues one at a time below, or
          toggle spoilers in the nav.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) =>
          showSpoilers ? (
            <SpoilerItemCard
              key={`spoiler-${item.itemNumber}`}
              item={item}
              players={players}
            />
          ) : (
            <PlayAlongItemCard
              key={`playalong-${item.itemNumber}`}
              item={item}
              players={players}
            />
          ),
        )}
      </div>
    </section>
  );
}
