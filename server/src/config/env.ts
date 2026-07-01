import { z } from 'zod';

/**
 * Validation des variables d'environnement au démarrage (fail-fast).
 * Aucun identifiant de service externe n'est jamais codé en dur.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères (256 bits) — openssl rand -hex 32'),
  // Clé maîtresse (32 octets base64) pour chiffrer les clés API stockées en base.
  // Optionnelle : sans elle, les clés API restent gérées via l'environnement.
  APP_ENCRYPTION_KEY: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  // Cible CNAME affichée aux clients pour brancher leur domaine personnalisé
  // (host Railway du service, ou fallback Cloudflare le moment venu). Optionnel.
  CUSTOM_DOMAIN_TARGET: z.string().optional(),
  // Domaine de base des sous-domaines self-service (ex. `prevent360.app` → rockinrio.prevent360.app).
  // Nécessite un wildcard DNS+TLS *.<domaine> côté hébergeur. Optionnel (dormant si absent).
  PLATFORM_BASE_DOMAIN: z.string().optional(),

  // « Continuer avec Google » : ID client OAuth (public, pas un secret). Optionnel :
  // sans lui, le bouton Google reste masqué (parcours email + mot de passe inchangé).
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Stripe (inscription payante). Optionnels : sans eux, la facturation est dormante.
  // Clés SECRÈTES → uniquement via l'environnement. STRIPE_PRICE_ID est public.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Sentry (suivi des erreurs serveur). Optionnel : sans DSN, aucune télémétrie (dormant).
  SENTRY_DSN: z.string().optional(),

  // Mode global : « simulation » (journalisation, aucun envoi) ou « live » (fournisseurs réels).
  NOTIFICATIONS_MODE: z.enum(['simulation', 'live']).default('simulation'),
  EMAIL_PROVIDER: z.enum(['brevo']).default('brevo'),
  SMS_PROVIDER: z.enum(['twilio', 'brevo']).default('twilio'),

  // Brevo (email + éventuellement SMS)
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().default('PR Event 360'),
  BREVO_SMS_SENDER: z.string().default('PREvent'),

  // Twilio (SMS)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // Cloudinary (stockage des médias de la newsroom) — gérable aussi via l'UI Intégrations.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
