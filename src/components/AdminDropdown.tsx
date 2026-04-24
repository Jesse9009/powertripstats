'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

import { adminRoutes } from '@/config/adminRoutes';
import { authClient } from '@/lib/auth-client';

export function AdminDropdown() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Hide dropdown while session is loading or if user is not an admin
  if (isPending || session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded hover:bg-secondary hover:cursor-pointer"
      >
        Admin
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 z-50 rounded-md border border-border bg-background shadow-md py-1">
          {adminRoutes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-foreground font-semibold bg-secondary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {route.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
