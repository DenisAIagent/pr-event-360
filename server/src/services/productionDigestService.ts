import { findEventById, getBranding, listEventMemberIds } from '../db/repositories/eventRepo';
import { findUserById } from '../db/repositories/userRepo';
import { insertNotification } from '../db/repositories/notificationRepo';
import {
  eventsWithPendingReviews,
  getDigestSentAt,
  reviewsSince,
  touchDigestSent,
  type ReviewDigestRow,
} from '../db/repositories/productionRepo';
import { getEmailProvider } from './notifications/providers';
import { eventSenderName, renderBrandedEmail, textToHtml } from './notifications/email';

const TYPE_LABEL: Record<string, string> = {
  interview: 'Interview',
  photo_report: 'Reportage photo',
  video_report: 'Reportage vidéo',
};

function line(r: ReviewDigestRow): string {
  const verdict = r.verdict === 'favorable' ? 'FAVORABLE' : 'DÉFAVORABLE';
  const who = r.contactName ? ` (${r.contactName})` : '';
  const head = `• ${verdict}${who} — ${r.artistName ?? 'participant n.c.'} · ${TYPE_LABEL[r.requestType] ?? r.requestType}`;
  const from = `  ${r.journalistName} — ${r.media ?? 'média n.c.'}`;
  return r.comment ? `${head}\n${from}\n  « ${r.comment} »` : `${head}\n${from}`;
}

/**
 * Récapitulatif quotidien des avis production d'un événement, envoyé aux membres
 * de l'événement.
 *
 * Le regroupement est délibéré : une prod traite souvent tout son lot en une
 * session, ce qui produirait autant d'emails que d'avis. La borne est
 * `production_digest_state.last_sent_at`, donc un avis n'est jamais compté deux
 * fois même si le job repasse.
 */
export async function sendProductionDigest(eventId: string): Promise<{ reviews: number; recipients: number }> {
  const event = await findEventById(eventId);
  if (!event) return { reviews: 0, recipients: 0 };

  const since = (await getDigestSentAt(eventId)) ?? new Date(0).toISOString();
  const reviews = await reviewsSince(eventId, since);
  if (reviews.length === 0) {
    // Rien de neuf : on ne déplace pas la borne, un avis arrivé entre-temps
    // resterait sinon invisible.
    return { reviews: 0, recipients: 0 };
  }

  const memberIds = await listEventMemberIds(eventId);
  const members = (await Promise.all(memberIds.map((id) => findUserById(id)))).filter(
    (u): u is NonNullable<typeof u> => !!u?.email,
  );
  if (members.length === 0) {
    // Sans destinataire, on avance quand même la borne : réémettre indéfiniment
    // le même lot au prochain passage n'apporterait rien.
    await touchDigestSent(eventId);
    return { reviews: reviews.length, recipients: 0 };
  }

  const favorable = reviews.filter((r) => r.verdict === 'favorable').length;
  const subject = `${event.name} — ${reviews.length} avis production (${favorable} favorable(s))`;
  const body = `Avis reçus des productions pour ${event.name} :\n\n${reviews.map(line).join('\n\n')}\n\nRetrouvez-les dans l’onglet Demandes du back-office.`;

  const branding = await getBranding(eventId).catch(() => null);
  const html = renderBrandedEmail({
    innerHtml: textToHtml(body),
    branding,
    eventName: event.name,
    footer: `Récapitulatif interne — ${event.name}.`,
  });

  const provider = await getEmailProvider();
  for (const member of members) {
    const result = await provider
      .send({ to: member.email, subject, body, html, fromName: eventSenderName(event.name) })
      .catch(() => ({ status: 'failed' as const, provider: provider.name, error: 'exception' }));
    await insertNotification({
      eventId,
      journalistId: null,
      channel: 'email',
      triggerKey: 'production_reviews_digest',
      lang: 'fr',
      toAddress: member.email,
      subject,
      body,
      provider: result.provider,
      status: result.status,
    });
  }

  await touchDigestSent(eventId);
  return { reviews: reviews.length, recipients: members.length };
}

/** Passe sur tous les événements ayant reçu des avis depuis leur dernier envoi. */
export async function sendProductionDigests(): Promise<void> {
  const eventIds = await eventsWithPendingReviews();
  for (const eventId of eventIds) {
    // Un événement en échec ne doit pas priver les autres de leur récapitulatif.
    await sendProductionDigest(eventId).catch(() => undefined);
  }
}
