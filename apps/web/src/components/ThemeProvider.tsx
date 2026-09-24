'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSavedAccentColor, applyAccentColor, ACCENT_PRESETS, type AccentColorPreset } from '@/lib/theme';

interface AccentColorContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
  presets: AccentColorPreset[];
}

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: '#6366F1',
  setAccentColor: () => {},
  presets: ACCENT_PRESETS,
});

export function useAccentColor() {
  return useContext(AccentColorContext);
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getSavedAccentColor();
    }
    return '#6366F1';
  });

  useEffect(() => {
    const saved = getSavedAccentColor();
    setAccentColorState(saved);
    applyAccentColor(saved);
  }, []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    applyAccentColor(color);
  }, []);

  return (
    <NextThemesProvider {...props}>
      <AccentColorContext.Provider value={{ accentColor, setAccentColor, presets: ACCENT_PRESETS }}>
        {children}
      </AccentColorContext.Provider>
    </NextThemesProvider>
  );
}
