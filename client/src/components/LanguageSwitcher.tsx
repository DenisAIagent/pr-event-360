import { Button } from '@/components/ui/button';
import { useI18n, type Lang } from '../i18n';

/** Sélecteur de langue ; n'affiche que les langues actives de l'événement. */
export function LanguageSwitcher({ available }: { available: Lang[] }) {
  const { lang, setLang } = useI18n();
  if (available.length <= 1) return null;
  return (
    <div className="inline-flex gap-1" role="group" aria-label="Language">
      {available.map((l) => (
        <Button
          key={l}
          type="button"
          size="sm"
          variant={l === lang ? 'default' : 'ghost'}
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
          className="uppercase"
        >
          {l}
        </Button>
      ))}
    </div>
  );
}
