# Hide Admin Dropdown from Non-Admin Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the `AdminDropdown` nav component entirely from users who are not authenticated with `role === 'admin'`.

**Architecture:** Use `authClient.useSession()` from `better-auth/react` (already imported elsewhere in the codebase) inside `AdminDropdown`. While the session is loading or if the user is not an admin, render `null`. This is purely a UI visibility change — server-side protection remains unchanged.

**Tech Stack:** better-auth (client), React hooks, Next.js App Router, TypeScript

---

### Task 1: Gate `AdminDropdown` rendering on admin session

**Files:**
- Modify: `src/components/AdminDropdown.tsx`

- [ ] **Step 1: Add `authClient` import**

Open `src/components/AdminDropdown.tsx`. Add this import alongside the existing imports:

```tsx
import { authClient } from '@/lib/auth-client';
```

- [ ] **Step 2: Add session check inside the component**

Replace the top of the `AdminDropdown` function body (lines 11–13, before the `usePathname` call) with the session guard. The full updated component:

```tsx
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
```

- [ ] **Step 3: Run the linter to verify no type errors**

```bash
npm run lint
```

Expected: no errors or warnings related to `AdminDropdown.tsx`.

- [ ] **Step 4: Manually verify in the browser**

Start the dev server:
```bash
npm run dev
```

1. Open `http://localhost:3000` — confirm the Admin dropdown is **not visible** in the header.
2. Navigate to `http://localhost:3000/admin/login` and sign in with an admin account.
3. Return to `http://localhost:3000` — confirm the Admin dropdown **is now visible** in the header.
4. Sign out — confirm the Admin dropdown disappears again.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminDropdown.tsx
git commit -m "feat: hide admin dropdown from non-admin users"
```
