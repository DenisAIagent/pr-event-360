import cron from 'node-cron';
import { pool } from './db/pool';
import { sendRecapsForFrequency } from './services/recapService';
import { purgeExpiredJournalists } from './services/retentionService';
import { sendCoverageRequests } from './services/coverageService';
import { purgeAuditEntriesOlderThan } from './db/repositories/auditRepo';
import { purgeNotificationsOlderThan } from './db/repositories/notificationRepo';
import { captureError } from './lib/sentry';

/**
 * Conservation du journal d'audit. Assez long pour instruire une violation ou une
 * demande d'accès (art. 33/15), assez court pour rester proportionné (art. 5.1.e).
 */
const AUDIT_RETENTION_MONTHS = 12;
/** Journal des notifications (copie des emails/SMS envoyés) : même rétention que l'audit. */
const NOTIF_RETENTION_MONTHS = 12;

/** Journalise ET remonte à Sentry (si configuré) l'échec d'une tâche planifiée. */
function jobFailed(job: string): (err: unknown) => void {
  return (err) => {
    console.error(`[scheduler] ${job}`, err);
    captureError(err, { scheduledJob: job });
  };
}

/**
 * Exécute une tâche planifiée sous VERROU consultatif Postgres
 * (`pg_try_advisory_lock`). Avec plusieurs instances de l'API, une seule détient
 * le verrou : les autres ignorent le tick au lieu d'exécuter le job en double
 * (emails de récap / relances envoyés deux fois). Le verrou est relâché en fin
 * de tâche — ou automatiquement par Postgres si l'instance meurt (fin de session).
 */
async function runExclusive(lockKey: number, jobName: string, fn: () => Promise<unknown>): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ got: boolean }>('SELECT pg_try_advisory_lock($1) AS got', [lockKey]);
    if (!rows[0]?.got) {
      console.log(`[scheduler] ${jobName} : déjà détenu par une autre instance — tick ignoré`);
      return;
    }
    await fn();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch(() => undefined);
    client.release();
  }
}

// Clés de verrou stables (arbitraires, une par tâche — ne jamais réutiliser).
const LOCK = {
  recapDaily: 720_001,
  recapWeekly: 720_002,
  retention: 720_003,
  auditRetention: 720_004,
  coverage: 720_005,
  notifRetention: 720_006,
} as const;

/**
 * Planificateur des récapitulatifs d'inscriptions.
 *  - quotidien : tous les jours à 08:00
 *  - hebdomadaire : le lundi à 08:00
 * Fuseau Europe/Paris. Idempotent grâce à `last_sent_at` côté récap et au verrou
 * consultatif inter-instances (`runExclusive`).
 */
export function startScheduler(): void {
  const tz = 'Europe/Paris';

  cron.schedule(
    '0 8 * * *',
    () => {
      void runExclusive(LOCK.recapDaily, 'daily', () => sendRecapsForFrequency('daily')).catch(jobFailed('daily'));
    },
    { timezone: tz },
  );

  cron.schedule(
    '0 8 * * 1',
    () => {
      void runExclusive(LOCK.recapWeekly, 'weekly', () => sendRecapsForFrequency('weekly')).catch(jobFailed('weekly'));
    },
    { timezone: tz },
  );

  // Rétention RGPD (art. 5.1.e) : purge quotidienne des journalistes 12 mois après l'événement.
  cron.schedule(
    '30 3 * * *',
    () => {
      void runExclusive(LOCK.retention, 'rétention', async () => {
        const n = await purgeExpiredJournalists();
        if (n > 0) console.log(`[rétention] ${n} journaliste(s) supprimé(s) (conservation > 12 mois)`);
      }).catch(jobFailed('rétention'));
    },
    { timezone: tz },
  );

  // Rétention du journal d'audit (RGPD art. 5.1.e) : purge quotidienne au-delà de 12 mois.
  cron.schedule(
    '45 3 * * *',
    () => {
      void runExclusive(LOCK.auditRetention, 'audit-retention', async () => {
        const n = await purgeAuditEntriesOlderThan(AUDIT_RETENTION_MONTHS);
        if (n > 0) console.log(`[audit] ${n} entrée(s) purgée(s) (conservation > ${AUDIT_RETENTION_MONTHS} mois)`);
      }).catch(jobFailed('audit-retention'));
    },
    { timezone: tz },
  );

  // Revue de presse : email de collecte des retombées J+3 après la fin de l'événement.
  cron.schedule(
    '0 9 * * *',
    () => {
      void runExclusive(LOCK.coverage, 'revue-presse', () => sendCoverageRequests()).catch(jobFailed('revue-presse'));
    },
    { timezone: tz },
  );

  // Rétention du journal des notifications : purge quotidienne au-delà de 12 mois
  // (table à croissance continue, une ligne par email/SMS envoyé).
  cron.schedule(
    '15 4 * * *',
    () => {
      void runExclusive(LOCK.notifRetention, 'notif-retention', async () => {
        const n = await purgeNotificationsOlderThan(NOTIF_RETENTION_MONTHS);
        if (n > 0) console.log(`[notifications] ${n} entrée(s) purgée(s) (conservation > ${NOTIF_RETENTION_MONTHS} mois)`);
      }).catch(jobFailed('notif-retention'));
    },
    { timezone: tz },
  );

  console.log(
    'Planificateur démarré (récaps 08:00 / lundi 08:00 ; purges 03:30-04:15 ; retombées 09:00, Europe/Paris ; verrous inter-instances actifs)',
  );
}
