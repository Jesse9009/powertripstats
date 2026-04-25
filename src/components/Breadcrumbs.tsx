'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  games: 'Games',
  admin: 'Admin',
  participants: 'Participants',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);

  const isGameDetailPage = segments[0] === 'games' && segments.length === 2;

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    const isNumeric = /^\d+$/.test(segment);

    let label: string;
    if (isNumeric && isGameDetailPage && index === 1) {
      label = `Game #${segment}`;
    } else {
      label = LABELS[segment] ?? segment;
    }

    return { href, label, isLast };
  });

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
            {crumb.isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
