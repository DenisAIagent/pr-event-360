import { useI18n, type Lang } from '../i18n';

/** Sélecteur de langue ; n'affiche que les langues actives de l'événement. */
export function LanguageSwitcher({ available }: { available: Lang[] }) {
  const { lang, setLang } = useI18n();
  if (available.length <= 1) return null;
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {available.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
