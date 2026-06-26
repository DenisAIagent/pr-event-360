import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import fr from './fr.json';
import en from './en.json';
import pt from './pt.json';
import es from './es.json';

export const LANGS = ['fr', 'en', 'pt', 'es'] as const;
export type Lang = (typeof LANGS)[number];

const DICTS: Record<Lang, Record<string, string>> = { fr, en, pt, es };

export type Translate = (key: string, vars?: Record<string, string>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);
}

export function I18nProvider({
  initialLang = 'fr',
  children,
}: {
  initialLang?: Lang;
  children: ReactNode;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const value = useMemo<I18nValue>(() => {
    const t: Translate = (key, vars) => {
      // Repli sur le français si une clé manque dans la langue active.
      const text = DICTS[lang][key] ?? DICTS.fr[key] ?? key;
      return interpolate(text, vars);
    };
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans un I18nProvider');
  return ctx;
}

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
