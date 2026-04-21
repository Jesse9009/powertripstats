'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { ItemCard, type ItemData } from '@/components/GameDataPage/ItemCard';

interface ItemsGridProps {
  items: ItemData[];
}

interface ItemRevealState {
  revealedClueCount: number;
  answerRevealed: boolean;
}

export function ItemsGrid({ items }: ItemsGridProps) {
  const { showSpoilers } = useSiteSettings();

  const makeDefaultState = (expanded: boolean): Map<number, ItemRevealState> => {
    const map = new Map<number, ItemRevealState>();
    items.forEach((item) => {
      map.set(item.itemNumber, {
        revealedClueCount: expanded ? item.clues.length : 0,
        answerRevealed: expanded,
      });
    });
    return map;
  };

  const [revealState, setRevealState] = useState<Map<number, ItemRevealState>>(
    () => makeDefaultState(showSpoilers),
  );
  const [allExpanded, setAllExpanded] = useState(showSpoilers);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRevealState(makeDefaultState(showSpoilers));
    setAllExpanded(showSpoilers);
  }, [showSpoilers]);

  const revealNextClue = (itemNumber: number) => {
    setRevealState((prev) => {
      const next = new Map(prev);
      const current = next.get(itemNumber);
      if (!current) return prev;
      const item = items.find((i) => i.itemNumber === itemNumber);
      if (!item) return prev;
      if (current.revealedClueCount < item.clues.length) {
        next.set(itemNumber, {
          ...current,
          revealedClueCount: current.revealedClueCount + 1,
        });
      }
      return next;
    });
  };

  const revealAnswer = (itemNumber: number) => {
    setRevealState((prev) => {
      const next = new Map(prev);
      const current = next.get(itemNumber);
      if (!current) return prev;
      const item = items.find((i) => i.itemNumber === itemNumber);
      if (!item) return prev;
      next.set(itemNumber, {
        revealedClueCount: item.clues.length,
        answerRevealed: true,
      });
      return next;
    });
  };

  const expandAll = () => {
    setRevealState(makeDefaultState(true));
    setAllExpanded(true);
  };

  const collapseAll = () => {
    setRevealState(makeDefaultState(false));
    setAllExpanded(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Items</h2>
        <Button variant="outline" size="sm" onClick={allExpanded ? collapseAll : expandAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const state = revealState.get(item.itemNumber) ?? {
            revealedClueCount: 0,
            answerRevealed: false,
          };
          return (
            <ItemCard
              key={item.itemNumber}
              item={item}
              revealedClueCount={state.revealedClueCount}
              answerRevealed={state.answerRevealed}
              onRevealNextClue={() => revealNextClue(item.itemNumber)}
              onRevealAnswer={() => revealAnswer(item.itemNumber)}
            />
          );
        })}
      </div>
    </div>
  );
}
