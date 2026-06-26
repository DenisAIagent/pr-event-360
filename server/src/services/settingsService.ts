import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { decryptSecret, encryptSecret, isEncryptionAvailable } from '../lib/crypto';
import { deleteSecret, getAllSecrets, upsertSecret } from '../db/repositories/secretRepo';

/** Clés de configuration gérables via l'UI. `secret` = valeur masquée à l'affichage. */
export const MANAGED_KEYS = [
  { key: 'NOTIFICATIONS_MODE', label: 'Mode d’envoi (simulation/live)', secret: false },
  { key: 'EMAIL_PROVIDER', label: 'Fournisseur email', secret: false },
  { key: 'SMS_PROVIDER', label: 'Fournisseur SMS', secret: false },
  { key: 'BREVO_API_KEY', label: 'Brevo — clé API', secret: true },
  { key: 'BREVO_SENDER_EMAIL', label: 'Brevo — email expéditeur', secret: false },
  { key: 'BREVO_SENDER_NAME', label: 'Brevo — nom expéditeur', secret: false },
  { key: 'BREVO_SMS_SENDER', label: 'Brevo — émetteur SMS', secret: false },
  { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio — Account SID', secret: true },
  { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio — Auth Token', secret: true },
  { key: 'TWILIO_FROM', label: 'Twilio — numéro émetteur', secret: false },
  { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloudinary — Cloud name', secret: false },
  { key: 'CLOUDINARY_API_KEY', label: 'Cloudinary — API Key', secret: false },
  { key: 'CLOUDINARY_API_SECRET', label: 'Cloudinary — API Secret', secret: true },
] as const;

type ManagedKey = (typeof MANAGED_KEYS)[number]['key'];

// Cache mémoire des surcharges DB déchiffrées, invalidé à chaque écriture.
let overridesCache: Map<string, string> | null = null;

function invalidateCache(): void {
  overridesCache = null;
}

/** Réinitialise le cache des surcharges (utile en test). */
export function __resetSettingsCache(): void {
  overridesCache = null;
}

async function dbOverrides(): Promise<Map<string, string>> {
  if (overridesCache) return overridesCache;
  const map = new Map<string, string>();
  if (isEncryptionAvailable()) {
    const rows = await getAllSecrets();
    for (const row of rows) {
      try {
        map.set(row.key, decryptSecret(row.valueEncrypted));
      } catch {
        // Valeur indéchiffrable (clé maîtresse changée) : on l'ignore → fallback env.
      }
    }
  }
  overridesCache = map;
  return map;
}

export interface NotifSettings {
  mode: 'simulation' | 'live';
  emailProvider: 'brevo';
  smsProvider: 'twilio' | 'brevo';
  brevo: { apiKey?: string; senderEmail?: string; senderName: string; smsSender: string };
  twilio: { accountSid?: string; authToken?: string; from?: string };
}

/** Configuration effective des notifications : surcharge DB sinon valeur d'environnement. */
export async function getNotifSettings(): Promise<NotifSettings> {
  const env = loadEnv();
  const o = await dbOverrides();
  const pick = (key: ManagedKey, fallback?: string): string | undefined =>
    o.has(key) ? o.get(key) : fallback;

  const mode = pick('NOTIFICATIONS_MODE', env.NOTIFICATIONS_MODE) === 'live' ? 'live' : 'simulation';
  const smsProvider = pick('SMS_PROVIDER', env.SMS_PROVIDER) === 'brevo' ? 'brevo' : 'twilio';

  return {
    mode,
    emailProvider: 'brevo',
    smsProvider,
    brevo: {
      apiKey: pick('BREVO_API_KEY', env.BREVO_API_KEY),
      senderEmail: pick('BREVO_SENDER_EMAIL', env.BREVO_SENDER_EMAIL),
      senderName: pick('BREVO_SENDER_NAME', env.BREVO_SENDER_NAME) ?? 'PR Event 360',
      smsSender: pick('BREVO_SMS_SENDER', env.BREVO_SMS_SENDER) ?? 'PREvent',
    },
    twilio: {
      accountSid: pick('TWILIO_ACCOUNT_SID', env.TWILIO_ACCOUNT_SID),
      authToken: pick('TWILIO_AUTH_TOKEN', env.TWILIO_AUTH_TOKEN),
      from: pick('TWILIO_FROM', env.TWILIO_FROM),
    },
  };
}

export interface StorageSettings {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

/** Config Cloudinary effective (surcharge DB sinon environnement). */
export async function getStorageSettings(): Promise<StorageSettings> {
  const env = loadEnv();
  const o = await dbOverrides();
  const pick = (key: ManagedKey, fallback?: string) => (o.has(key) ? o.get(key) : fallback);
  return {
    cloudName: pick('CLOUDINARY_CLOUD_NAME', env.CLOUDINARY_CLOUD_NAME),
    apiKey: pick('CLOUDINARY_API_KEY', env.CLOUDINARY_API_KEY),
    apiSecret: pick('CLOUDINARY_API_SECRET', env.CLOUDINARY_API_SECRET),
  };
}

export interface SecretStatus {
  key: string;
  label: string;
  secret: boolean;
  source: 'db' | 'env' | 'none';
  preview: string | null; // valeur (non secrète) ou masque (secrète)
}

/** État des réglages pour l'UI : source effective + aperçu masqué des secrets. */
export async function getSettingsStatus(): Promise<{ encryptionReady: boolean; items: SecretStatus[] }> {
  const env = loadEnv() as unknown as Record<string, string | undefined>;
  const o = await dbOverrides();

  const items = MANAGED_KEYS.map(({ key, label, secret }): SecretStatus => {
    const inDb = o.has(key);
    const value = inDb ? o.get(key) : env[key];
    const source: SecretStatus['source'] = inDb ? 'db' : value ? 'env' : 'none';
    let preview: string | null = null;
    if (value) preview = secret ? maskSecret(value) : value;
    return { key, label, secret, source, preview };
  });

  return { encryptionReady: isEncryptionAvailable(), items };
}

function maskSecret(value: string): string {
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

const MANAGED_KEY_SET = new Set<string>(MANAGED_KEYS.map((m) => m.key));

/**
 * Enregistre des réglages. Une valeur non vide est chiffrée et stockée ; une chaîne
 * vide supprime la surcharge (retour à la valeur d'environnement).
 */
export async function setSecrets(
  updates: Record<string, string>,
  updatedBy: string | null,
): Promise<void> {
  if (!isEncryptionAvailable()) {
    throw AppError.badRequest(
      'Chiffrement non configuré : définissez APP_ENCRYPTION_KEY (32 octets base64) pour gérer les clés API en base.',
    );
  }
  for (const [key, raw] of Object.entries(updates)) {
    if (!MANAGED_KEY_SET.has(key)) continue; // on ignore les clés inconnues
    const value = raw.trim();
    if (value === '') {
      await deleteSecret(key);
    } else {
      await upsertSecret(key, encryptSecret(value), updatedBy);
    }
  }
  invalidateCache();
}
