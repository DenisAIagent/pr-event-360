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
    <div className="deadline-card">
      <div className="deadline-head">
        <span className="deadline-icon" aria-hidden="true">
          <Icon name="clock" />
        </span>
        <div>
          <span className="deadline-label">{t('acc.deadline.label')}</span>
          <strong className="deadline-date">{dateStr}</strong>
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
