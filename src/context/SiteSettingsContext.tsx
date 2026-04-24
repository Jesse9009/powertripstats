'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type SiteSettingsContextValue = {
  showSpoilers: boolean;
  handleShowSpoilerChange: (checked: boolean) => void;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(
  undefined,
);

export function SiteSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSpoilers, setShowSpoilers] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const stored = document.documentElement.getAttribute('data-show-spoilers') === 'true';
    setShowSpoilers(stored);
    document.documentElement.setAttribute('data-spoilers-ready', '');
  }, []);

  const handleShowSpoilerChange = (checked: boolean) => {
    setShowSpoilers(checked);
    localStorage.setItem('showSpoilers', checked.toString());
  };

  const ctx = useMemo(
    () => ({
      showSpoilers,
      handleShowSpoilerChange,
    }),
    [showSpoilers],
  );

  return (
    <SiteSettingsContext.Provider value={ctx}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  }

  return context;
}
