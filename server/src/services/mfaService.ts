import QRCode from 'qrcode';
import { generateSecret, keyuri, verifyTotp } from '../lib/totp';
import { encryptSecret, decryptSecret, isEncryptionAvailable } from '../lib/crypto';
import { AppError } from '../http/AppError';
import {
  getUserMfa,
  setUserMfaSecret,
  enableUserMfa,
  clearUserMfa,
} from '../db/repositories/userRepo';

const ISSUER = 'PR Event 360';

function requireEncryption(): void {
  if (!isEncryptionAvailable()) {
    throw AppError.badRequest(
      "Le chiffrement (APP_ENCRYPTION_KEY) est requis pour activer la double authentification.",
    );
  }
}

/** Démarre l'enrôlement : génère un secret, le stocke chiffré (non activé), renvoie le QR. */
export async function startMfaSetup(userId: string, email: string): Promise<{ qr: string; otpauth: string }> {
  requireEncryption();
  const secret = generateSecret();
  await setUserMfaSecret(userId, encryptSecret(secret));
  const otpauth = keyuri(email, ISSUER, secret);
  const qr = await QRCode.toDataURL(otpauth);
  return { qr, otpauth };
}

/** Active la MFA après vérification d'un premier code (preuve que l'app est configurée). */
export async function confirmMfa(userId: string, code: string): Promise<void> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.secret) throw AppError.badRequest('Aucune configuration de double authentification en cours.');
  if (!verifyTotp(code, decryptSecret(mfa.secret))) {
    throw AppError.unauthorized('Code incorrect, réessayez.');
  }
  await enableUserMfa(userId);
}

/** Désactive la MFA (exige un code valide). */
export async function disableMfa(userId: string, code: string): Promise<void> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.enabled || !mfa.secret) throw AppError.badRequest("La double authentification n'est pas active.");
  if (!verifyTotp(code, decryptSecret(mfa.secret))) {
    throw AppError.unauthorized('Code incorrect, réessayez.');
  }
  await clearUserMfa(userId);
}

/** Vérifie un code TOTP lors de la connexion. */
export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  const mfa = await getUserMfa(userId);
  if (!mfa?.enabled || !mfa.secret) return false;
  return verifyTotp(code, decryptSecret(mfa.secret));
}

export async function getMfaStatus(userId: string): Promise<{ enabled: boolean }> {
  const mfa = await getUserMfa(userId);
  return { enabled: mfa?.enabled ?? false };
}
