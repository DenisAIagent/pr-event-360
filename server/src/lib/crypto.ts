import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { loadEnv } from '../config/env';

/**
 * Chiffrement symétrique AES-256-GCM des secrets stockés en base (clés API des
 * outils externes). La clé maîtresse vient de APP_ENCRYPTION_KEY (32 octets en
 * base64) — JAMAIS en base, uniquement dans l'environnement.
 *
 * Format du blob stocké : base64(iv).base64(authTag).base64(ciphertext)
 */
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // recommandé pour GCM

function masterKey(): Buffer {
  const env = loadEnv();
  if (!env.APP_ENCRYPTION_KEY) {
    throw new Error(
      'APP_ENCRYPTION_KEY est requis pour gérer les clés API en base (32 octets en base64).',
    );
  }
  const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY doit faire exactement 32 octets (base64).');
  }
  return key;
}

/** Le chiffrement des secrets est-il configuré (clé maîtresse présente et valide) ? */
export function isEncryptionAvailable(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Secret chiffré au format invalide');
  }
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
