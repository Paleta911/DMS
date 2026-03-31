import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messages, type Locale } from './messages';

const STORAGE_KEY = 'dms-locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return resolveLocale(import.meta.env.VITE_DEFAULT_LOCALE as string | undefined);
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return resolveLocale(stored ?? (import.meta.env.VITE_DEFAULT_LOCALE as string | undefined));
}

function resolveLocale(value?: string | null): Locale {
  return value === 'en' ? 'en' : 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = messages[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => {
        let template = dictionary[key] ?? messages.es[key] ?? key;
        if (params) {
          for (const [paramKey, paramValue] of Object.entries(params)) {
            template = template.replaceAll(`{${paramKey}}`, String(paramValue));
          }
        }
        return template;
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
