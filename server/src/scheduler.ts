import cron from 'node-cron';
import { sendRecapsForFrequency } from './services/recapService';

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

  console.log('Planificateur des récapitulatifs démarré (quotidien 08:00, hebdo lundi 08:00, Europe/Paris)');
}
