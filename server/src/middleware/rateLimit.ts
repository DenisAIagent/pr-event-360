import type { Request } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { sendError } from '../http/respond';

interface ScopedLimiterOptions {
  /** Fenêtre glissante, en millisecondes. */
  windowMs: number;
  /** Nombre de requêtes autorisées par clé sur la fenêtre. */
  limit: number;
  /** Clé de comptage — par défaut l'IP. Permet de compter par ressource ciblée. */
  keyGenerator?: (req: Request) => string;
  /** Message renvoyé au client une fois le quota atteint. */
  message?: string;
}

/**
 * Limiteur de débit répondant dans l'enveloppe API (`{ success:false, error }`)
 * plutôt que dans le format texte par défaut d'express-rate-limit, et exposant
 * `Retry-After` pour permettre un cooldown côté interface.
 */
export function scopedRateLimit({
  windowMs,
  limit,
  keyGenerator,
  message = 'Trop de requêtes, réessayez plus tard.',
}: ScopedLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Un keyGenerator explicite remplace celui par défaut (basé sur l'IP) : la
    // validation IPv6 d'express-rate-limit ne s'applique alors pas.
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, res) => {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      sendError(res, 429, message, { retryAfterSeconds: retryAfterSec });
    },
  });
}
