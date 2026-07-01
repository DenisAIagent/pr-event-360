import { loadEnv } from '../config/env';
import {
  listJournalistsByEvent,
  listJournalistsForCoverageRequest,
  touchJournalistCoverageSent,
} from '../db/repositories/journalistRepo';
import { coverageStatsByEvent } from '../db/repositories/coverageRepo';
import { getEventOrThrow } from './eventService';
import { sendNotification } from './notifications/notificationService';
import { TRIGGERS } from './notifications/templates';

const env = loadEnv();

/**
 * Email automatique de collecte des retombées : envoyé à chaque journaliste accrédité accepté
 * quand `fin de l'événement + son délai de publication choisi (3/8/30 j)` est atteint.
 * Idempotent via `journalists.coverage_request_sent_at`.
 */
export async function sendCoverageRequests(): Promise<void> {
  const journalists = await listJournalistsForCoverageRequest();
  for (const j of journalists) {
    await sendNotification({
      eventId: j.eventId,
      eventName: j.eventName,
      journalist: j,
      triggerKey: TRIGGERS.COVERAGE_REQUEST,
      variables: { link: `${env.CLIENT_URL}/espace/${j.token}`, delay: String(j.publishDelayDays) },
    });
    await touchJournalistCoverageSent(j.id);
  }
  if (journalists.length > 0) {
    console.log(`[revue-presse] ${journalists.length} demande(s) de retombées envoyée(s)`);
  }
}

/**
 * Relance manuelle depuis le back-office : un journaliste précis, ou par défaut tous les accrédités
 * acceptés qui n'ont encore rien déposé. Renvoie le nombre d'emails envoyés.
 */
export async function remindCoverage(eventId: string, journalistId?: string): Promise<number> {
  const event = await getEventOrThrow(eventId);
  let journalists = (await listJournalistsByEvent(eventId)).filter(
    (j) => j.accStatus === 'acceptee' && j.email && j.token,
  );
  if (journalistId) {
    journalists = journalists.filter((j) => j.id === journalistId);
  } else {
    const submitted = new Set((await coverageStatsByEvent(eventId)).map((s) => s.journalistId));
    journalists = journalists.filter((j) => !submitted.has(j.id));
  }
  for (const j of journalists) {
    await sendNotification({
      eventId,
      eventName: event.name,
      journalist: j,
      triggerKey: TRIGGERS.COVERAGE_REQUEST,
      variables: { link: `${env.CLIENT_URL}/espace/${j.token}`, delay: String(j.publishDelayDays) },
    });
  }
  return journalists.length;
}
