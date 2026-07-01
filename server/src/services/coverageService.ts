import { loadEnv } from '../config/env';
import { listEventsForCoverageRequest, touchCoverageSent } from '../db/repositories/eventRepo';
import { listJournalistsByEvent } from '../db/repositories/journalistRepo';
import { coverageStatsByEvent } from '../db/repositories/coverageRepo';
import { getEventOrThrow } from './eventService';
import { sendNotification } from './notifications/notificationService';
import { TRIGGERS } from './notifications/templates';

const env = loadEnv();

/**
 * Email automatique J+3 : pour chaque événement terminé depuis ≥ 3 jours et non encore relancé,
 * invite les journalistes accrédités acceptés à déposer leurs retombées (revue de presse).
 * Idempotent via `events.coverage_request_sent_at`.
 */
export async function sendCoverageRequests(): Promise<void> {
  const events = await listEventsForCoverageRequest();
  for (const event of events) {
    const journalists = (await listJournalistsByEvent(event.id)).filter(
      (j) => j.accStatus === 'acceptee' && j.email && j.token,
    );
    for (const j of journalists) {
      await sendNotification({
        eventId: event.id,
        eventName: event.name,
        journalist: j,
        triggerKey: TRIGGERS.COVERAGE_REQUEST,
        variables: { link: `${env.CLIENT_URL}/espace/${j.token}` },
      });
    }
    await touchCoverageSent(event.id);
    console.log(`[revue-presse] demande de retombées envoyée à ${journalists.length} journaliste(s) — ${event.name}`);
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
      variables: { link: `${env.CLIENT_URL}/espace/${j.token}` },
    });
  }
  return journalists.length;
}
