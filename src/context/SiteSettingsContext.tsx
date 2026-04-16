'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type SiteSettingsContextValue = {
  showSpoilers: boolean;
  toggleSpoilers: () => void;
  setShowSpoilers: (value: boolean) => void;
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

  const value = useMemo(
    () => ({
      showSpoilers,
      toggleSpoilers: () => setShowSpoilers((prev) => !prev),
      setShowSpoilers,
    }),
    [showSpoilers],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
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
