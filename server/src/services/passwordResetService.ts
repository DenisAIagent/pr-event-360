import argon2 from 'argon2';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { generateResetToken, hashResetToken } from '../lib/token';
import {
  createResetToken,
  deletePendingForUser,
  findValidByHash,
  markUsed,
} from '../db/repositories/passwordResetRepo';
import { findUserByEmail, updatePasswordHash } from '../db/repositories/userRepo';
import { getEmailProvider } from './notifications/providers';

// Durée de validité du lien de réinitialisation.
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

/**
 * Démarre une réinitialisation : si un compte existe pour cet email, génère un
 * jeton à usage unique et envoie le lien par email. Ne révèle JAMAIS l'existence
 * du compte (réponse générique côté route) → résout toujours sans erreur.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase();
  const user = await findUserByEmail(normalized);
  if (!user) return; // silencieux : anti-énumération

  // Un seul lien actif à la fois.
  await deletePendingForUser(user.id);

  const rawToken = generateResetToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await createResetToken({ userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt });

  await deliverResetLink(user.email, rawToken);
}

/**
 * Consomme un jeton et définit le nouveau mot de passe. Lève une erreur générique
 * si le jeton est inconnu, déjà utilisé ou expiré (pas de fuite d'information).
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const found = await findValidByHash(hashResetToken(rawToken));
  if (!found) throw AppError.badRequest('Lien invalide ou expiré. Veuillez en redemander un.');

  const passwordHash = await argon2.hash(newPassword);
  await updatePasswordHash(found.userId, passwordHash);
  await markUsed(found.id);
}

/**
 * Compose et envoie le lien de réinitialisation via le fournisseur email actif.
 * En mode simulation (aucun envoi réel), le lien est journalisé côté serveur pour
 * permettre de tester le parcours en développement.
 */
async function deliverResetLink(toEmail: string, rawToken: string): Promise<void> {
  const env = loadEnv();
  const resetUrl = `${env.CLIENT_URL}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;

  const subject = 'Réinitialisation de votre mot de passe — PR Event 360';
  const body = [
    'Bonjour,',
    '',
    'Vous avez demandé à réinitialiser votre mot de passe du back-office PR Event 360.',
    'Cliquez sur le lien ci-dessous (valable 1 heure) :',
    '',
    resetUrl,
    '',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.",
  ].join('\n');

  const result = await (await getEmailProvider()).send({ to: toEmail, subject, body });

  // Mode simulation : aucun email ne part. On expose le lien dans les logs serveur
  // pour le développement. À NE PAS faire en production (NOTIFICATIONS_MODE=live).
  if (result.status === 'simulated') {
    console.info(`[reset-password][simulation] lien pour ${toEmail} : ${resetUrl}`);
  } else if (result.status === 'failed') {
    console.error(`[reset-password] échec d'envoi à ${toEmail} via ${result.provider}: ${result.error ?? ''}`);
  }
}
