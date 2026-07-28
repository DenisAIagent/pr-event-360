import QRCode from 'qrcode';
import { generateSecret, keyuri, verifyTotpCounter } from '../lib/totp';
import { encryptSecret, decryptSecret, isEncryptionAvailable } from '../lib/crypto';
import { AppError } from '../http/AppError';
import {
  getUserMfa,
  setUserMfaPendingSecret,
  enableUserMfa,
  clearUserMfa,
  consumeMfaCounter,
} from '../db/repositories/userRepo';

const ISSUER = 'PR Event 360';

function requireEncryption(): void {
  if (!isEncryptionAvailable()) {
    throw AppError.badRequest(
      "Le chiffrement (APP_ENCRYPTION_KEY) est requis pour activer la double authentification.",
    );
  }
}

/**
 * Vérifie un code TOTP ET consomme sa fenêtre : un code reste mathématiquement
 * valide ~90 s, il pouvait donc être rejoué s'il était intercepté. Chaque code
 * n'est désormais accepté qu'une fois, et toute fenêtre antérieure à la dernière
 * consommée est refusée.
 */
async function verifyAndConsume(userId: string, code: string, secretEnc: string): Promise<boolean> {
  const counter = verifyTotpCounter(code, decryptSecret(secretEnc));
  if (counter === null) return false;
  return consumeMfaCounter(userId, counter);
}

/**
 * Démarre l'enrôlement. Si la MFA est déjà active, le code courant est exigé et
 * l'ancien secret reste valide jusqu'à la confirmation du nouveau.
 */
export async function startMfaSetup(
  userId: string,
  email: string,
  currentCode?: string,
): Promise<{ qr: string; otpauth: string }> {
  requireEncryption();
  const current = await getUserMfa(userId);
  if (current?.enabled) {
    if (
      !current.secret ||
      !currentCode ||
      !(await verifyAndConsume(userId, currentCode, current.secret))
    ) {
      throw AppError.unauthorized('Un code de double authentification actuel valide est requis.');
    }
  }
  const secret = generateSecret();
  await setUserMfaPendingSecret(userId, encryptSecret(secret));
  const otpauth = keyuri(email, ISSUER, secret);
  const qr = await QRCode.toDataURL(otpauth);
  return { qr, otpauth };
}

/** Active la MFA après vérification d'un premier code (preuve que l'app est configurée). */
export async function confirmMfa(userId: string, code: string): Promise<void> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.pendingSecret) throw AppError.badRequest('Aucune configuration de double authentification en cours.');
  const counter = verifyTotpCounter(code, decryptSecret(mfa.pendingSecret));
  if (counter === null) {
    throw AppError.unauthorized('Code incorrect, réessayez.');
  }
  if (!(await enableUserMfa(userId, mfa.pendingSecret))) {
    throw AppError.unauthorized('La configuration a changé, recommencez l’enrôlement.');
  }
  // Le code de confirmation ne doit pas resservir immédiatement comme code de connexion.
  await consumeMfaCounter(userId, counter);
}

/** Désactive la MFA (exige un code valide, non rejoué). */
export async function disableMfa(userId: string, code: string): Promise<void> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.enabled || !mfa.secret) throw AppError.badRequest("La double authentification n'est pas active.");
  if (!(await verifyAndConsume(userId, code, mfa.secret))) {
    throw AppError.unauthorized('Code incorrect, réessayez.');
  }
  await clearUserMfa(userId);
}

/** Vérifie un code TOTP lors de la connexion (un code n'est accepté qu'une fois). */
export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.enabled || !mfa.secret) return false;
  return verifyAndConsume(userId, code, mfa.secret);
}

export async function getMfaStatus(userId: string): Promise<{ enabled: boolean }> {
  const mfa = await getUserMfa(userId);
  return { enabled: mfa?.enabled ?? false };
}
