import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language } from './types';
import { translations, type Translation } from './translations';

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translation;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'betpro_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ur' || stored === 'en' ? stored : 'en';
  });

  const setLang = (l: Language) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    const dir = translations[lang].dir;
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: translations[lang], dir: translations[lang].dir }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
