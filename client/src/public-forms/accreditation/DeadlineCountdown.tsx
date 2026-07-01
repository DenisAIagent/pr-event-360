import { useI18n, type Lang } from '../../i18n';
import { Countdown } from '../../components/Countdown';
import { Icon } from '../../components/Icon';

const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB', pt: 'pt-PT', es: 'es-ES' };

/**
 * Bandeau « Clôture des inscriptions » + compteur live, multilingue. Appelle
 * `onExpired` quand le délai est écoulé (la page bascule en « inscriptions closes »).
 */
export function DeadlineCountdown({
  deadline,
  onExpired,
}: {
  deadline: string;
  onExpired: () => void;
}) {
  const { t, lang } = useI18n();
  const dateStr = new Date(Date.parse(deadline)).toLocaleString(LOCALE[lang] ?? 'fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <Icon name="clock" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('acc.deadline.label')}
          </span>
          <strong className="font-semibold">{dateStr}</strong>
        </div>
      </div>
      <Countdown
        deadline={deadline}
        onExpired={onExpired}
        labels={{
          days: t('acc.deadline.days'),
          hours: t('acc.deadline.hours'),
          minutes: t('acc.deadline.minutes'),
          seconds: t('acc.deadline.seconds'),
        }}
      />
    </div>
  );
}
