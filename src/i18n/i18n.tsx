import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Notify } from '../native/NotifyModule';
import { type Lang, translate } from './strings';

const PREF_KEY = 'lang';

interface I18nValue {
  lang: Lang;
  ready: boolean;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: 'tr',
  ready: false,
  setLang: () => {},
  t: (key) => key,
});

/** App-wide language provider. Defaults to Turkish; persists the choice via the native pref store. */
export function I18nProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lang, setLangState] = useState<Lang>('tr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Notify.getPref(PREF_KEY)
      .then((v) => {
        if (v === 'tr' || v === 'en') setLangState(v);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    Notify.setPref(PREF_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      ready,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, ready, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
