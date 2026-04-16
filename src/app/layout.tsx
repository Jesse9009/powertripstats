import type { Metadata } from 'next';
import { Syne, Figtree } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { AdminDropdown } from '@/components/AdminDropdown';
import { SpoilersToggle } from '@/components/SpoilersToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'PowerTripStats Starter',
  description: 'Next.js + shadcn/ui + Drizzle ORM + Turso libSQL starter',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${figtree.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&p)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteSettingsProvider>
          <ThemeProvider>
            <nav className="w-full bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link
                  href="/"
                  className="text-xl font-bold text-foreground hover:opacity-80 transition-opacity"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  PowerTripStats
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    href="/games"
                    className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded hover:bg-secondary"
                  >
                    Games
                  </Link>
                  <AdminDropdown />
                  <ThemeToggle />
                  <SpoilersToggle />
                </div>
              </div>
            </nav>
            {children}
            <Toaster />
          </ThemeProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
