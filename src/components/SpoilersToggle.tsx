'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { Switch } from '@/components/ui/switch';

export function SpoilersToggle() {
  const { showSpoilers, handleShowSpoilerChange } = useSiteSettings();
  const Icon = showSpoilers ? Eye : EyeOff;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
        showSpoilers
          ? 'bg-primary/8 text-primary'
          : 'text-muted-foreground hover:bg-secondary'
      }`}
      onClick={() => handleShowSpoilerChange(!showSpoilers)}
    >
      <Icon size={15} strokeWidth={2} />
      <label
        htmlFor="show-spoilers"
        className="text-sm cursor-pointer select-none"
      >
        Spoilers
      </label>
      <Switch
        id="show-spoilers"
        checked={showSpoilers}
        onCheckedChange={handleShowSpoilerChange}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
