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

/**
 * Locale BCP 47 correspondant à une langue de l'app, pour `toLocaleDateString`
 * et consorts : sans elle, les dates des surfaces publiques restent en français
 * même quand le reste de la page est traduit.
 */
const LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  pt: 'pt-PT',
  es: 'es-ES',
};

export function localeOf(lang: Lang): string {
  return LOCALES[lang];
}

/** Langue préférée du navigateur, ramenée à une langue supportée (fr par défaut). */
export function detectBrowserLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr';
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const p of prefs) {
    const code = p?.slice(0, 2).toLowerCase();
    if (code && (LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return 'fr';
}

/**
 * Chaque route publique monte son propre `I18nProvider` : sans persistance, la
 * langue choisie serait perdue en passant de la newsroom à un communiqué, ou du
 * formulaire d'accréditation à l'espace. Préférence fonctionnelle (pas de
 * traçage) : stockage local, exempté de consentement.
 */
const LANG_KEY = 'pr360_lang';

function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v && isLang(v) ? v : null;
  } catch {
    return null; // Safari en navigation privée, stockage désactivé…
  }
}

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: Lang;
  children: ReactNode;
}) {
  // Priorité : langue imposée → dernier choix de l'utilisateur → langue du
  // navigateur. Les surfaces d'événement la ramènent ensuite aux langues actives.
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? readStoredLang() ?? detectBrowserLang());

  const value = useMemo<I18nValue>(() => {
    const setLang = (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {
        /* stockage indisponible : la langue reste valable pour la page courante */
      }
    };
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
