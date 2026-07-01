import cron from 'node-cron';
import { sendRecapsForFrequency } from './services/recapService';
import { purgeExpiredJournalists } from './services/retentionService';

/**
 * Planificateur des récapitulatifs d'inscriptions.
 *  - quotidien : tous les jours à 08:00
 *  - hebdomadaire : le lundi à 08:00
 * Fuseau Europe/Paris. Idempotent grâce à `last_sent_at` côté récap.
 */
export function startScheduler(): void {
  const tz = 'Europe/Paris';

  cron.schedule(
    '0 8 * * *',
    () => {
      void sendRecapsForFrequency('daily').catch((err) => console.error('[scheduler] daily', err));
    },
    { timezone: tz },
  );

  cron.schedule(
    '0 8 * * 1',
    () => {
      void sendRecapsForFrequency('weekly').catch((err) => console.error('[scheduler] weekly', err));
    },
    { timezone: tz },
  );

  // Rétention RGPD (art. 5.1.e) : purge quotidienne des journalistes 12 mois après l'événement.
  cron.schedule(
    '30 3 * * *',
    () => {
      void purgeExpiredJournalists()
        .then((n) => {
          if (n > 0) console.log(`[rétention] ${n} journaliste(s) supprimé(s) (conservation > 12 mois)`);
        })
        .catch((err) => console.error('[scheduler] rétention', err));
    },
    { timezone: tz },
  );

  console.log(
    'Planificateur démarré (récaps 08:00 / lundi 08:00 ; purge rétention 03:30, Europe/Paris)',
  );
}
