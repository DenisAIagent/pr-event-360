import argon2 from 'argon2';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { generateResetToken, hashResetToken } from '../lib/token';
import {
  findAcceptedJournalistByEmail,
  findAcceptedJournalistByEmailForReset,
  findJournalistByToken,
  setJournalistPassword,
} from '../db/repositories/journalistRepo';
import {
  createJournalistReset,
  deletePendingForJournalist,
  findValidJournalistResetByHash,
  markJournalistResetUsed,
} from '../db/repositories/journalistResetRepo';
import { getBranding, findEventById } from '../db/repositories/eventRepo';
import { ctaButton, eventSenderName, sendBrandedEmail } from './notifications/email';

const MIN_PASSWORD_LENGTH = 8;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 heure

/**
 * Le journaliste (accès par lien magique) définit ou remplace son mot de passe d'espace.
 * Lui permet ensuite de se reconnecter par email + mot de passe, sans dépendre de l'email.
 */
export async function setSpacePassword(token: string, password: string): Promise<void> {
  const journalist = await findJournalistByToken(token);
  if (!journalist) throw AppError.notFound('Espace introuvable');
  if (journalist.accStatus !== 'acceptee') {
    throw AppError.forbidden('Accréditation non encore acceptée');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`);
  }
  const passwordHash = await argon2.hash(password);
  await setJournalistPassword(journalist.id, passwordHash);
}

/**
 * Login journaliste par email + mot de passe (compte par événement). En cas de succès,
 * renvoie le token d'espace existant : le client redirige alors vers /espace/:token.
 */
export async function journalistLogin(
  eventId: string,
  email: string,
  password: string,
): Promise<{ token: string; firstName: string }> {
  const journalist = await findAcceptedJournalistByEmail(eventId, email);
  // Message générique : on ne révèle pas si un compte existe.
  const invalid = AppError.unauthorized('Email ou mot de passe incorrect');
  if (!journalist || !journalist.passwordHash) {
    // Hachage factice anti-timing pour ne pas divulguer l'existence du compte.
    await argon2.hash(password).catch(() => undefined);
    throw invalid;
  }
  const ok = await argon2.verify(journalist.passwordHash, password);
  if (!ok || !journalist.token) throw invalid;
  return { token: journalist.token, firstName: journalist.firstName };
}

/**
 * Démarre une réinitialisation : si un journaliste accepté existe pour cet (événement, email),
 * génère un jeton à usage unique (1 h) et envoie le lien par email. Ne révèle jamais
 * l'existence du compte (la route répond de façon générique).
 */
export async function requestJournalistPasswordReset(eventId: string, email: string): Promise<void> {
  const journalist = await findAcceptedJournalistByEmailForReset(eventId, email);
  if (!journalist) return; // silencieux : anti-énumération

  await deletePendingForJournalist(journalist.id);
  const rawToken = generateResetToken();
  await createJournalistReset({
    journalistId: journalist.id,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  await deliverResetLink(journalist.email, eventId, rawToken);
}

/** Consomme un jeton de réinitialisation et pose le nouveau mot de passe. */
export async function resetJournalistPassword(rawToken: string, newPassword: string): Promise<void> {
  const found = await findValidJournalistResetByHash(hashResetToken(rawToken));
  if (!found) throw AppError.badRequest('Lien invalide ou expiré. Veuillez en redemander un.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`);
  }
  const passwordHash = await argon2.hash(newPassword);
  await setJournalistPassword(found.journalistId, passwordHash);
  await markJournalistResetUsed(found.id);
}

/** Compose et envoie le lien de réinitialisation via le fournisseur email actif. */
async function deliverResetLink(toEmail: string, eventId: string, rawToken: string): Promise<void> {
  const env = loadEnv();
  const resetUrl = `${env.CLIENT_URL}/evenement/${eventId}/reinitialiser?token=${encodeURIComponent(rawToken)}`;
  const subject = 'Réinitialisation de votre mot de passe — Espace journaliste';
  const branding = await getBranding(eventId).catch(() => null);
  const event = await findEventById(eventId).catch(() => null);
  const innerHtml =
    `<p style="margin:0 0 12px;">Bonjour,</p>` +
    `<p style="margin:0 0 12px;">Vous avez demandé à réinitialiser le mot de passe de votre espace journaliste. Cliquez ci-dessous (lien valable 1 heure) pour en choisir un nouveau :</p>` +
    ctaButton(resetUrl, 'Choisir un nouveau mot de passe') +
    `<p style="margin:16px 0 0;color:#9aa0a6;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>`;

  const result = await sendBrandedEmail({
    to: toEmail,
    subject,
    innerHtml,
    branding,
    eventName: event?.name ?? null,
    fromName: event?.name ? eventSenderName(event.name) : undefined,
  });
  if (result.status === 'simulated') {
    // Lien complet seulement hors production (confort de dev) ; jamais de token en logs prod.
    if (env.NODE_ENV === 'production') console.info(`[journalist-reset][simulation] lien généré pour ${toEmail} (token omis en production)`);
    else console.info(`[journalist-reset][simulation] lien pour ${toEmail} : ${resetUrl}`);
  } else if (result.status === 'failed') {
    console.error(
      `[journalist-reset] échec d'envoi à ${toEmail} via ${result.provider}: ${result.error ?? ''}`,
    );
  }
}
