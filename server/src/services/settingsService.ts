import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { decryptSecret, encryptSecret, isEncryptionAvailable } from '../lib/crypto';
import { deleteSecret, getAllSecrets, upsertSecret } from '../db/repositories/secretRepo';

/**
 * Groupes d'intégration présentés comme autant de cartes dans le back-office.
 * L'ordre fait foi côté interface.
 */
export const SETTINGS_GROUPS = [
  {
    id: 'notifications',
    label: 'Envoi des notifications',
    description:
      'Mode d’envoi global et fournisseurs utilisés. En simulation, aucun message ne part réellement.',
  },
  {
    id: 'stripe',
    label: 'Stripe — paiements et offres',
    description:
      'Clés API et Price IDs des offres commerciales (Événement, Pack 3, Agence, Média Plus). Saisis ici, ils priment sur Railway sans redéploiement.',
  },
  {
    id: 'cloudinary',
    label: 'Cloudinary — photos, vidéos et dossiers de presse',
    description:
      'Stockage des médias. Sans ces clés, l’envoi de fichiers est désactivé : les organisateurs ne peuvent déposer ni visuel ni dossier de presse.',
  },
  {
    id: 'brevo',
    label: 'Brevo — emails et SMS',
    description: 'Acheminement des emails transactionnels (accréditations, liens d’accès, récapitulatifs).',
  },
  {
    id: 'twilio',
    label: 'Twilio — SMS',
    description: 'Alternative à Brevo pour l’envoi des SMS.',
  },
] as const;

export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number]['id'];

/**
 * Clés de configuration gérables via l'UI. `secret` = valeur masquée à l'affichage,
 * `hint` = aide affichée sous le champ (où trouver la valeur, contraintes à respecter).
 * `optional` = non requis pour marquer le groupe « Configuré ».
 */
export const MANAGED_KEYS = [
  {
    key: 'NOTIFICATIONS_MODE',
    label: 'Mode d’envoi',
    group: 'notifications',
    secret: false,
    hint: '« simulation » (rien ne part, tout est journalisé) ou « live » (envois réels).',
  },
  { key: 'EMAIL_PROVIDER', label: 'Fournisseur email', group: 'notifications', secret: false, hint: 'brevo' },
  {
    key: 'SMS_PROVIDER',
    label: 'Fournisseur SMS',
    group: 'notifications',
    secret: false,
    hint: 'brevo ou twilio',
  },

  {
    key: 'STRIPE_SECRET_KEY',
    label: 'Secret Key',
    group: 'stripe',
    secret: true,
    hint: 'Dashboard Stripe → Developers → API keys → Secret key (sk_live_… ou sk_test_…).',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    label: 'Webhook signing secret',
    group: 'stripe',
    secret: true,
    hint: 'Developers → Webhooks → endpoint /api/stripe/webhook → Signing secret (whsec_…).',
  },
  {
    key: 'STRIPE_PRICE_EVENT',
    label: 'Price ID — Événement (800 €)',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Products → prix one-time 800 € HT → ID price_…. Repli aussi sur STRIPE_PRICE_ID.',
  },
  {
    key: 'STRIPE_PRICE_ID',
    label: 'Price ID — repli historique',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Ancien champ unique. Utilisé si STRIPE_PRICE_EVENT est vide.',
  },
  {
    key: 'STRIPE_PRICE_PACK3',
    label: 'Price ID — Pack 3 (2 100 €)',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Prix one-time 2 100 € HT → price_…',
  },
  {
    key: 'STRIPE_PRICE_AGENCY',
    label: 'Price ID — Agence (6 000 € / an)',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Prix abonnement annuel 6 000 € HT → price_… (mode subscription).',
  },
  {
    key: 'STRIPE_PRICE_AGENCY_EXTRA',
    label: 'Price ID — Extra agence (450 €)',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Prix one-time 450 € HT par événement supplémentaire.',
  },
  {
    key: 'STRIPE_PRICE_MEDIA_PLUS',
    label: 'Price ID — Média Plus (+200 €)',
    group: 'stripe',
    secret: false,
    optional: true,
    hint: 'Prix one-time +200 € HT pour 100 Go sur un événement.',
  },

  {
    key: 'CLOUDINARY_CLOUD_NAME',
    label: 'Cloud name',
    group: 'cloudinary',
    secret: false,
    hint: 'Tableau de bord Cloudinary → Programmable Media → Dashboard, champ « Cloud name ».',
  },
  {
    key: 'CLOUDINARY_API_KEY',
    label: 'API Key',
    group: 'cloudinary',
    secret: false,
    hint: 'Même écran, champ « API Key ». Cette valeur est publique (elle voyage jusqu’au navigateur).',
  },
  {
    key: 'CLOUDINARY_API_SECRET',
    label: 'API Secret',
    group: 'cloudinary',
    secret: true,
    hint: 'Même écran, champ « API Secret ». Ne quitte jamais le serveur : il sert à signer les envois.',
  },
  {
    key: 'CLOUDINARY_UPLOAD_PRESET',
    label: 'Nom du preset d’upload',
    group: 'cloudinary',
    secret: false,
    hint: 'Settings → Upload → Upload presets. Le preset doit être en mode « Signed » et imposer un Max file size ≤ 209 715 200 octets (200 Mio), sinon les envois sont refusés.',
  },

  {
    key: 'BREVO_API_KEY',
    label: 'Clé API',
    group: 'brevo',
    secret: true,
    hint: 'Brevo → SMTP & API → clé de type « API key » (commence par xkeysib-).',
  },
  {
    key: 'BREVO_SENDER_EMAIL',
    label: 'Email expéditeur',
    group: 'brevo',
    secret: false,
    hint: 'Doit être un expéditeur vérifié dans Brevo, sinon les emails sont rejetés silencieusement.',
  },
  { key: 'BREVO_SENDER_NAME', label: 'Nom expéditeur', group: 'brevo', secret: false, hint: '' },
  { key: 'BREVO_SMS_SENDER', label: 'Émetteur SMS', group: 'brevo', secret: false, hint: '11 caractères maximum.' },

  { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', group: 'twilio', secret: true, hint: '' },
  { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', group: 'twilio', secret: true, hint: '' },
  {
    key: 'TWILIO_FROM',
    label: 'Numéro émetteur',
    group: 'twilio',
    secret: false,
    hint: 'Au format international, ex. +33612345678.',
  },
] as const;

type ManagedKey = (typeof MANAGED_KEYS)[number]['key'];

// Cache mémoire des surcharges DB déchiffrées, invalidé à chaque écriture
// ET expiré par TTL : avec plusieurs instances, une écriture faite sur une
// autre instance ne passe pas par invalidateCache() locale — le TTL borne la
// dérive de configuration entre replicas (max 30 s).
const OVERRIDES_TTL_MS = 30_000;
let overridesCache: { map: Map<string, string>; at: number } | null = null;

function invalidateCache(): void {
  overridesCache = null;
}

/** Réinitialise le cache des surcharges (utile en test). */
export function __resetSettingsCache(): void {
  overridesCache = null;
}

async function dbOverrides(): Promise<Map<string, string>> {
  if (overridesCache && Date.now() - overridesCache.at < OVERRIDES_TTL_MS) return overridesCache.map;
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
  overridesCache = { map, at: Date.now() };
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
  uploadPreset?: string;
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
    uploadPreset: pick('CLOUDINARY_UPLOAD_PRESET', env.CLOUDINARY_UPLOAD_PRESET),
  };
}

export interface StripeSettings {
  secretKey?: string;
  webhookSecret?: string;
  /** Repli historique / offre Événement. */
  priceId?: string;
  priceEvent?: string;
  pricePack3?: string;
  priceAgency?: string;
  priceAgencyExtra?: string;
  priceMediaPlus?: string;
}

/** Config Stripe effective (surcharge DB chiffrée sinon variables d'environnement). */
export async function getStripeSettings(): Promise<StripeSettings> {
  const env = loadEnv();
  const o = await dbOverrides();
  const pick = (key: ManagedKey, fallback?: string) => (o.has(key) ? o.get(key) : fallback);
  return {
    secretKey: pick('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY),
    webhookSecret: pick('STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET),
    priceId: pick('STRIPE_PRICE_ID', env.STRIPE_PRICE_ID),
    priceEvent: pick('STRIPE_PRICE_EVENT', env.STRIPE_PRICE_EVENT),
    pricePack3: pick('STRIPE_PRICE_PACK3', env.STRIPE_PRICE_PACK3),
    priceAgency: pick('STRIPE_PRICE_AGENCY', env.STRIPE_PRICE_AGENCY),
    priceAgencyExtra: pick('STRIPE_PRICE_AGENCY_EXTRA', env.STRIPE_PRICE_AGENCY_EXTRA),
    priceMediaPlus: pick('STRIPE_PRICE_MEDIA_PLUS', env.STRIPE_PRICE_MEDIA_PLUS),
  };
}

export interface SecretStatus {
  key: string;
  label: string;
  group: string;
  hint: string;
  secret: boolean;
  optional?: boolean;
  source: 'db' | 'env' | 'none';
  preview: string | null; // valeur (non secrète) ou masque (secrète)
}

export interface SettingsGroupStatus {
  id: string;
  label: string;
  description: string;
  /** Toutes les clés du groupe sont renseignées (l'intégration est donc exploitable). */
  configured: boolean;
}

export interface SettingsStatus {
  encryptionReady: boolean;
  groups: SettingsGroupStatus[];
  items: SecretStatus[];
}

/** État des réglages pour l'UI : source effective + aperçu masqué des secrets. */
export async function getSettingsStatus(): Promise<SettingsStatus> {
  const env = loadEnv() as unknown as Record<string, string | undefined>;
  const o = await dbOverrides();

  const items = MANAGED_KEYS.map((m): SecretStatus => {
    const { key, label, group, hint, secret } = m;
    const optional = 'optional' in m && m.optional === true;
    const inDb = o.has(key);
    const value = inDb ? o.get(key) : env[key];
    const source: SecretStatus['source'] = inDb ? 'db' : value ? 'env' : 'none';
    let preview: string | null = null;
    if (value) preview = secret ? maskSecret(value) : value;
    return { key, label, group, hint, secret, optional, source, preview };
  });

  const groups = SETTINGS_GROUPS.map(({ id, label, description }): SettingsGroupStatus => {
    const own = items.filter((it) => it.group === id);
    // Les champs optionnels (Price IDs Stripe secondaires) n'empêchent pas « Configuré ».
    const required = own.filter((it) => !it.optional);
    return {
      id,
      label,
      description,
      configured: required.length > 0 && required.every((it) => it.source !== 'none'),
    };
  });

  return { encryptionReady: isEncryptionAvailable(), groups, items };
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
