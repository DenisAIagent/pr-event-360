import type { RecapFrequency } from '../domain';
import { nowMs } from '../lib/clock';
import { findEventById, getRecap, getBranding, touchRecapSent } from '../db/repositories/eventRepo';
import { listJournalistsCreatedSince } from '../db/repositories/journalistRepo';
import { insertNotification } from '../db/repositories/notificationRepo';
import { getEmailProvider } from './notifications/providers';
import { eventSenderName, renderBrandedEmail, textToHtml } from './notifications/email';

const WINDOW_MS: Record<Exclude<RecapFrequency, 'none'>, number> = {
  daily: 24 * 3_600_000,
  weekly: 7 * 24 * 3_600_000,
};

export interface RecapResult {
  newRegistrations: number;
  recipients: number;
}

/**
 * Construit et envoie le récapitulatif des inscriptions d'un événement à l'équipe
 * presse (liste d'emails). « depuis » = dernier envoi, sinon la fenêtre de la
 * fréquence. Best-effort, et persiste chaque message (visible dans l'onglet Messages).
 */
export async function sendRecap(eventId: string): Promise<RecapResult> {
  const event = await findEventById(eventId);
  if (!event) return { newRegistrations: 0, recipients: 0 };

  const recap = await getRecap(eventId);
  if (recap.recipients.length === 0) return { newRegistrations: 0, recipients: 0 };

  const freq: Exclude<RecapFrequency, 'none'> = recap.frequency === 'weekly' ? 'weekly' : 'daily';
  const now = nowMs();
  const sinceIso = recap.lastSentAt ?? new Date(now - WINDOW_MS[freq]).toISOString();

  const newcomers = await listJournalistsCreatedSince(eventId, sinceIso);

  const periodLabel = freq === 'weekly' ? 'cette semaine' : 'aujourd’hui';
  const subject = `${event.name} — ${newcomers.length} inscription(s) ${periodLabel}`;
  const lines = newcomers.map((j) => {
    const name = `${j.firstName} ${j.lastName ?? ''}`.trim();
    return `• ${name} — ${j.media ?? 'média n.c.'} (${j.email}) — accréditation : ${j.accStatus}`;
  });
  const body =
    newcomers.length === 0
      ? `Aucune nouvelle inscription depuis le dernier récapitulatif.`
      : `Nouvelles inscriptions pour ${event.name} :\n\n${lines.join('\n')}`;

  const branding = await getBranding(eventId).catch(() => null);
  const html = renderBrandedEmail({
    innerHtml: textToHtml(body),
    branding,
    eventName: event.name,
    footer: `Récapitulatif interne — ${event.name}.`,
  });
  const provider = await getEmailProvider();
  for (const to of recap.recipients) {
    const result = await provider.send({ to, subject, body, html, fromName: eventSenderName(event.name) }).catch(() => ({
      status: 'failed' as const,
      provider: provider.name,
      error: 'exception',
    }));
    await insertNotification({
      eventId,
      journalistId: null,
      channel: 'email',
      triggerKey: `${freq}_recap`,
      lang: 'fr',
      toAddress: to,
      subject,
      body,
      provider: result.provider,
      status: result.status,
    });
  }

  await touchRecapSent(eventId);
  return { newRegistrations: newcomers.length, recipients: recap.recipients.length };
}

/** Envoie le récap immédiatement pour tous les événements d'une fréquence donnée. */
export async function sendRecapsForFrequency(frequency: 'daily' | 'weekly'): Promise<void> {
  const { listEventIdsByRecapFrequency } = await import('../db/repositories/eventRepo');
  const ids = await listEventIdsByRecapFrequency(frequency);
  for (const id of ids) {
    try {
      await sendRecap(id);
    } catch (err) {
      console.error(`[recap] échec pour l'événement ${id}`, err);
    }
  }
}
