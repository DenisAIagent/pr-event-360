import type { Lang } from '@pr-event-360/core';
import type { Journalist } from '../../domain';
import { findTemplate, getBranding } from '../../db/repositories/eventRepo';
import { insertNotification } from '../../db/repositories/notificationRepo';
import { DEFAULT_TEMPLATE_TEXT, renderTemplate, type TriggerKey } from './templates';
import { getEmailProvider, getSmsProvider } from './providers';
import { eventSenderName, renderBrandedEmail, textToHtml } from './email';

export interface SendNotificationInput {
  eventId: string;
  eventName: string;
  journalist: Pick<Journalist, 'id' | 'firstName' | 'email' | 'phone' | 'lang'>;
  triggerKey: TriggerKey;
  channel?: 'email' | 'sms';
  variables?: Record<string, string>;
}

/**
 * Envoie (ou simule) une notification, puis la PERSISTE pour visualisation dans
 * le back-office. À appeler HORS transaction (la livraison fait de l'I/O réseau).
 *
 * Best-effort : ne lève JAMAIS — une panne fournisseur ne doit pas casser le
 * flux métier (accréditation, demande). L'échec est journalisé et la
 * notification est conservée avec le statut « failed » (visible dans l'UI).
 */
export async function sendNotification(input: SendNotificationInput): Promise<void> {
  try {
    const channel = input.channel ?? 'email';
    const lang = input.journalist.lang;
    const toAddress = channel === 'sms' ? (input.journalist.phone ?? '') : input.journalist.email;
    if (!toAddress) return; // ex. SMS sans téléphone : pas de notification fantôme

    const { subject, body } = await resolveTemplate(input.eventId, lang, input.triggerKey, channel);
    const variables: Record<string, string> = {
      firstName: input.journalist.firstName,
      event: input.eventName,
      ...input.variables,
    };
    const renderedSubject = subject ? renderTemplate(subject, variables) : null;
    const renderedBody = renderTemplate(body, variables);

    let result;
    if (channel === 'email') {
      // Email habillé aux couleurs de l'événement (corps texte → HTML).
      const branding = await getBranding(input.eventId).catch(() => null);
      const html = renderBrandedEmail({
        innerHtml: textToHtml(renderedBody),
        branding,
        eventName: input.eventName,
      });
      result = await (await getEmailProvider()).send({
        to: toAddress,
        subject: renderedSubject ?? '',
        body: renderedBody,
        html,
        fromName: eventSenderName(input.eventName),
      });
    } else {
      result = await (await getSmsProvider()).send({ to: toAddress, body: renderedBody });
    }

    if (result.status === 'failed') {
      // Détail côté serveur uniquement (pas de fuite vers le client).
      console.error(
        `[notifications] échec ${input.triggerKey}/${channel} via ${result.provider}: ${result.error ?? ''}`,
      );
    }

    await insertNotification({
      eventId: input.eventId,
      journalistId: input.journalist.id,
      channel,
      triggerKey: input.triggerKey,
      lang,
      toAddress,
      subject: renderedSubject,
      body: renderedBody,
      provider: result.provider,
      status: result.status,
    });
  } catch (err) {
    console.error('[notifications] erreur inattendue', err);
  }
}

/** Cherche le template en base, retombe sur le texte par défaut de la langue. */
async function resolveTemplate(
  eventId: string,
  lang: Lang,
  triggerKey: TriggerKey,
  channel: 'email' | 'sms',
): Promise<{ subject: string | null; body: string }> {
  const stored = await findTemplate({ eventId, lang, triggerKey, channel });
  if (stored) return { subject: stored.subject, body: stored.body };
  const fallback = DEFAULT_TEMPLATE_TEXT[triggerKey][lang];
  return { subject: fallback.subject, body: fallback.body };
}
