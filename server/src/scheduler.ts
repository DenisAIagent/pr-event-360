import cron from 'node-cron';
import { sendRecapsForFrequency } from './services/recapService';
import { purgeExpiredJournalists } from './services/retentionService';
import { sendCoverageRequests } from './services/coverageService';
import { purgeAuditEntriesOlderThan } from './db/repositories/auditRepo';
import { captureError } from './lib/sentry';

/**
 * Conservation du journal d'audit. Assez long pour instruire une violation ou une
 * demande d'accès (art. 33/15), assez court pour rester proportionné (art. 5.1.e).
 */
const AUDIT_RETENTION_MONTHS = 12;

/** Journalise ET remonte à Sentry (si configuré) l'échec d'une tâche planifiée. */
function jobFailed(job: string): (err: unknown) => void {
  return (err) => {
    console.error(`[scheduler] ${job}`, err);
    captureError(err, { scheduledJob: job });
  };
}

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
      void sendRecapsForFrequency('daily').catch(jobFailed('daily'));
    },
    { timezone: tz },
  );

  cron.schedule(
    '0 8 * * 1',
    () => {
      void sendRecapsForFrequency('weekly').catch(jobFailed('weekly'));
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
        .catch(jobFailed('rétention'));
    },
    { timezone: tz },
  );

  // Rétention du journal d'audit (RGPD art. 5.1.e) : purge quotidienne au-delà de 12 mois.
  cron.schedule(
    '45 3 * * *',
    () => {
      void purgeAuditEntriesOlderThan(AUDIT_RETENTION_MONTHS)
        .then((n) => {
          if (n > 0) console.log(`[audit] ${n} entrée(s) purgée(s) (conservation > ${AUDIT_RETENTION_MONTHS} mois)`);
        })
        .catch(jobFailed('audit-retention'));
    },
    { timezone: tz },
  );

  // Revue de presse : email de collecte des retombées J+3 après la fin de l'événement.
  cron.schedule(
    '0 9 * * *',
    () => {
      void sendCoverageRequests().catch(jobFailed('revue-presse'));
    },
    { timezone: tz },
  );

  console.log(
    'Planificateur démarré (récaps 08:00 / lundi 08:00 ; purge rétention 03:30 ; retombées 09:00, Europe/Paris)',
  );
}
