import { AppError } from '../http/AppError';
import { getBranding } from '../db/repositories/eventRepo';
import { listJournalistsByEvent } from '../db/repositories/journalistRepo';
import { findNewsletter, markNewsletterSent } from '../db/repositories/newsletterRepo';
import { insertNotification } from '../db/repositories/notificationRepo';
import { getEventOrThrow } from './eventService';
import { getEmailProvider } from './notifications/providers';
import { eventSenderName, personalize, renderBrandedEmail, stripHtml } from './notifications/email';

export interface SendResult {
  sent: number;
  failed: number;
  total: number;
}

/**
 * Envoie une newsletter (brouillon) aux journalistes sélectionnés. Best-effort par
 * destinataire ; chaque envoi est persisté (visible dans Messages). Marque la
 * newsletter comme envoyée. Lève si déjà envoyée ou aucun destinataire valide.
 */
export async function sendNewsletter(
  eventId: string,
  newsletterId: string,
  journalistIds: string[],
): Promise<SendResult> {
  const newsletter = await findNewsletter(eventId, newsletterId);
  if (!newsletter) throw AppError.notFound('Newsletter introuvable');
  if (newsletter.status === 'sent') throw AppError.badRequest('Cette newsletter a déjà été envoyée');

  const event = await getEventOrThrow(eventId);
  const branding = await getBranding(eventId);

  const idSet = new Set(journalistIds);
  const all = await listJournalistsByEvent(eventId);
  const recipients = all.filter((j) => idSet.has(j.id) && j.email);
  if (recipients.length === 0) throw AppError.badRequest('Aucun destinataire valide sélectionné');

  const provider = await getEmailProvider();
  let sent = 0;
  let failed = 0;

  for (const j of recipients) {
    const html = renderBrandedEmail({
      innerHtml: personalize(newsletter.bodyHtml, j),
      branding,
      eventName: event.name,
    });
    const result = await provider
      .send({ to: j.email, subject: newsletter.subject, body: stripHtml(newsletter.bodyHtml), html, fromName: eventSenderName(event.name) })
      .catch(() => ({ status: 'failed' as const, provider: provider.name, error: 'exception' }));

    if (result.status === 'failed') failed += 1;
    else sent += 1;

    await insertNotification({
      eventId,
      journalistId: j.id,
      channel: 'email',
      triggerKey: 'newsletter',
      lang: j.lang,
      toAddress: j.email,
      subject: newsletter.subject,
      body: stripHtml(newsletter.bodyHtml),
      provider: result.provider,
      status: result.status,
    });
  }

  await markNewsletterSent(eventId, newsletterId, sent);
  return { sent, failed, total: recipients.length };
}
