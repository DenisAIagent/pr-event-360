import * as Sentry from '@sentry/node';
import { loadEnv } from '../config/env';

let enabled = false;

/**
 * Initialise Sentry côté serveur — UNIQUEMENT si SENTRY_DSN est configuré
 * (même pattern « dormant » que Stripe/Brevo : sans DSN, zéro télémétrie).
 * À appeler au tout début du démarrage.
 */
export function initSentry(): void {
  const env = loadEnv();
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Erreurs uniquement (pas de tracing) : télémétrie minimale, coût nul.
    tracesSampleRate: 0,
    // Ne jamais embarquer de données personnelles par défaut.
    sendDefaultPii: false,
  });
  enabled = true;
  console.log('[sentry] suivi des erreurs actif');
}

/** Capture une erreur inattendue (no-op si Sentry n'est pas configuré). */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
