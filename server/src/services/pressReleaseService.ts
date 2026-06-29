import { getBranding } from '../db/repositories/eventRepo';
import { listJournalistsByEvent } from '../db/repositories/journalistRepo';
import { insertNotification } from '../db/repositories/notificationRepo';
import { getEventOrThrow } from './eventService';
import { getEmailProvider } from './notifications/providers';
import type { SendResult } from './newsletterService';
import { personalize, renderBrandedEmail, stripHtml } from './notifications/email';

/**
 * Envoie un communiqué de presse par email aux journalistes ACCRÉDITÉS (acceptés).
 * Best-effort par destinataire ; chaque envoi est journalisé (Messages). Réutilise le
 * gabarit email de marque et le fournisseur des newsletters.
 */
export async function sendPressReleaseEmail(
  eventId: string,
  pr: { title: string; bodyHtml: string },
): Promise<SendResult> {
  const event = await getEventOrThrow(eventId);
  const branding = await getBranding(eventId);

  const all = await listJournalistsByEvent(eventId);
  const recipients = all.filter((j) => j.accStatus === 'acceptee' && j.email);
  if (recipients.length === 0) return { sent: 0, failed: 0, total: 0 };

  const provider = await getEmailProvider();
  let sent = 0;
  let failed = 0;

  for (const j of recipients) {
    const html = renderBrandedEmail({ innerHtml: personalize(pr.bodyHtml, j), branding, eventName: event.name });
    const result = await provider
      .send({ to: j.email, subject: pr.title, body: stripHtml(pr.bodyHtml), html })
      .catch(() => ({ status: 'failed' as const, provider: provider.name, error: 'exception' }));

    if (result.status === 'failed') failed += 1;
    else sent += 1;

    await insertNotification({
      eventId,
      journalistId: j.id,
      channel: 'email',
      triggerKey: 'press_release',
      lang: j.lang,
      toAddress: j.email,
      subject: pr.title,
      body: stripHtml(pr.bodyHtml),
      provider: result.provider,
      status: result.status,
    });
  }

  return { sent, failed, total: recipients.length };
}
