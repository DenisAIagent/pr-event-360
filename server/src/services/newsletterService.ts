import { AppError } from '../http/AppError';
import { getBranding } from '../db/repositories/eventRepo';
import { listJournalistsByEvent } from '../db/repositories/journalistRepo';
import { findNewsletter, markNewsletterSent } from '../db/repositories/newsletterRepo';
import { insertNotification } from '../db/repositories/notificationRepo';
import { getEventOrThrow } from './eventService';
import { getEmailProvider } from './notifications/providers';
import type { EventBranding, Journalist } from '../domain';

export interface SendResult {
  sent: number;
  failed: number;
  total: number;
}

/**
 * Habille le contenu HTML de l'utilisateur dans un gabarit email simple aux
 * couleurs de l'événement (logo + accent), en styles inline (compatibilité email).
 */
export function buildBrandedEmail(
  innerHtml: string,
  branding: EventBranding | null,
  eventName: string,
): string {
  const accent = branding?.accentColor ?? '#4f46e5';
  const logo = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${escapeHtml(eventName)}" style="max-height:48px;max-width:200px;" />`
    : `<strong style="font-size:18px;color:#111;">${escapeHtml(eventName)}</strong>`;

  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px;border-bottom:4px solid ${accent};">${logo}</td></tr>
        <tr><td style="padding:24px;font-size:15px;line-height:1.6;">${innerHtml}</td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;color:#888;font-size:12px;">
          Vous recevez cet email car vous êtes accrédité(e) pour ${escapeHtml(eventName)}.
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
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
    const html = buildBrandedEmail(
      personalize(newsletter.bodyHtml, j),
      branding,
      event.name,
    );
    const result = await provider
      .send({ to: j.email, subject: newsletter.subject, body: stripHtml(newsletter.bodyHtml), html })
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

/** Remplace {{firstName}} / {{lastName}} dans le corps. Simple et sûr. */
export function personalize(html: string, j: Journalist): string {
  return html
    .replace(/\{\{\s*firstName\s*\}\}/g, escapeHtml(j.firstName))
    .replace(/\{\{\s*lastName\s*\}\}/g, escapeHtml(j.lastName ?? ''));
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
