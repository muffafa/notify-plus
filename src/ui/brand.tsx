import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Notify } from '../native/NotifyModule';

export const DEFAULT_LOGO_COLOR = '#F97316'; // orange

const PREF_KEY = 'logoColor';

interface BrandValue {
  logoColor: string;
  setLogoColor: (hex: string) => void;
}

const BrandContext = createContext<BrandValue>({
  logoColor: DEFAULT_LOGO_COLOR,
  setLogoColor: () => {},
});

/** Normalize "#rgb" / "rgb" / "#rrggbb" to "#RRGGBB", or null if invalid. */
export function normalizeHex(input: string): string | null {
  let s = input.trim();
  if (!s.startsWith('#')) s = `#${s}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return null;
  if (s.length === 4) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s.toUpperCase();
}

/** Holds the user-chosen logo background color, persisted via the native pref store. */
export function BrandProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [logoColor, setLogoColorState] = useState<string>(DEFAULT_LOGO_COLOR);

  useEffect(() => {
    Notify.getPref(PREF_KEY)
      .then((v) => {
        const hex = v ? normalizeHex(v) : null;
        if (hex) setLogoColorState(hex);
      })
      .catch(() => {});
  }, []);

  const setLogoColor = useCallback((hex: string) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    setLogoColorState(norm);
    Notify.setPref(PREF_KEY, norm).catch(() => {});
  }, []);

  const value = useMemo(() => ({ logoColor, setLogoColor }), [logoColor, setLogoColor]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandValue {
  return useContext(BrandContext);
}
