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
  // Clés SECRÈTES → uniquement via l'environnement.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Legacy / repli offre Événement (paiement unique 800 €).
  STRIPE_PRICE_ID: z.string().optional(),
  // Price IDs par offre (Dashboard Stripe).
  STRIPE_PRICE_EVENT: z.string().optional(),
  STRIPE_PRICE_PACK3: z.string().optional(),
  STRIPE_PRICE_AGENCY: z.string().optional(),
  STRIPE_PRICE_AGENCY_EXTRA: z.string().optional(),
  STRIPE_PRICE_MEDIA_PLUS: z.string().optional(),

  // Sentry (suivi des erreurs serveur). Optionnel : sans DSN, aucune télémétrie (dormant).
  SENTRY_DSN: z.string().optional(),

  // Jeton d'accès à GET /api/metrics (Authorization: Bearer …).
  // En production, l'endpoint est masqué (404) si ce secret est absent.
  METRICS_TOKEN: z.string().min(16).optional(),

  // Redis (compteurs de rate-limit partagés entre instances). Optionnel en dev :
  // sans lui, les limiteurs restent en mémoire locale (compteurs par instance).
  // En production multi-instance, définir REQUIRE_REDIS=true pour refuser le démarrage
  // sans REDIS_URL (sinon les limites anti-bruteforce sont multipliées par N).
  REDIS_URL: z.string().optional(),
  REQUIRE_REDIS: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),

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
  // Preset SIGNÉ configuré chez Cloudinary avec max_file_size <= 200 Mio.
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
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
