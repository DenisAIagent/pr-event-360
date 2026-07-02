import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { generateResetToken, hashResetToken } from '../lib/token';
import type { JournalistSessionClaims } from '../lib/jwt';
import {
  findAcceptedJournalistByEmailForReset,
  findJournalistByAccessTokenHash,
  findJournalistById,
  setJournalistAccessToken,
} from '../db/repositories/journalistRepo';
import { getBranding, findEventById } from '../db/repositories/eventRepo';
import { ctaButton, eventSenderName, sendBrandedEmail } from './notifications/email';

const env = loadEnv();

/**
 * Durée de vie d'un lien d'accès. Assez longue pour couvrir la vie utile d'un
 * événement sans verrouiller les journalistes, tout en bornant l'exposition d'un
 * lien fuité (le jeton n'est stocké QUE haché — une fuite DB/backup ne l'expose pas).
 */
const ACCESS_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Émet un jeton d'accès pour un journaliste : stocke son hash + expiration, renvoie le jeton BRUT. */
export async function issueAccessToken(journalistId: string): Promise<string> {
  const rawToken = generateResetToken(); // 256 bits, non devinable → hash sans sel suffisant
  await setJournalistAccessToken(journalistId, hashResetToken(rawToken), new Date(Date.now() + ACCESS_TTL_MS));
  return rawToken;
}

/** URL du lien d'accès (établit la session à l'ouverture, puis redirige vers l'espace). */
export function accessLinkUrl(rawToken: string): string {
  return `${env.CLIENT_URL}/espace/${rawToken}`;
}

/**
 * Échange un jeton d'accès brut contre les claims de session (jid, eid). Le jeton
 * est comparé par HASH (jamais stocké en clair) ; il doit être valide, non expiré,
 * et l'accréditation acceptée.
 */
export async function exchangeAccessToken(rawToken: string): Promise<JournalistSessionClaims> {
  const journalist = await findJournalistByAccessTokenHash(hashResetToken(rawToken));
  if (!journalist) throw AppError.unauthorized('Lien d’accès invalide ou expiré. Demandez-en un nouveau.');
  if (journalist.accStatus !== 'acceptee') throw AppError.forbidden('Accréditation non encore acceptée');
  return { jid: journalist.id, eid: journalist.eventId };
}

/**
 * Renvoie un lien d'accès par email (parcours sans mot de passe / lien expiré).
 * Réponse générique côté route : ne révèle jamais l'existence du compte.
 */
export async function requestAccessLink(eventId: string, email: string): Promise<void> {
  const journalist = await findAcceptedJournalistByEmailForReset(eventId, email);
  if (!journalist) return; // silencieux : anti-énumération
  const rawToken = await issueAccessToken(journalist.id);
  await deliverAccessLink(journalist.email, eventId, rawToken);
}

/** Compose et envoie un email contenant le lien d'accès à l'espace. */
async function deliverAccessLink(toEmail: string, eventId: string, rawToken: string): Promise<void> {
  const url = accessLinkUrl(rawToken);
  const branding = await getBranding(eventId).catch(() => null);
  const event = await findEventById(eventId).catch(() => null);
  const innerHtml =
    `<p style="margin:0 0 12px;">Bonjour,</p>` +
    `<p style="margin:0 0 12px;">Voici votre lien d'accès à l'espace journaliste (valable 90 jours) :</p>` +
    ctaButton(url, 'Accéder à mon espace') +
    `<p style="margin:16px 0 0;color:#9aa0a6;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;
  const result = await sendBrandedEmail({
    to: toEmail,
    subject: 'Votre accès à l’espace journaliste',
    innerHtml,
    branding,
    eventName: event?.name ?? null,
    fromName: event?.name ? eventSenderName(event.name) : undefined,
  });
  if (result.status === 'simulated') {
    if (env.NODE_ENV === 'production') console.info(`[journalist-access][simulation] lien généré pour ${toEmail} (token omis en production)`);
    else console.info(`[journalist-access][simulation] lien pour ${toEmail} : ${url}`);
  } else if (result.status === 'failed') {
    console.error(`[journalist-access] échec d'envoi à ${toEmail} via ${result.provider}: ${result.error ?? ''}`);
  }
}

export { findJournalistById };
