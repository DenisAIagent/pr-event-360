import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { CSRF_COOKIE, csrfValid } from './session';
import {
  signProductionSession,
  verifyProductionSession,
  type ProductionSessionClaims,
} from './jwt';

const env = loadEnv();
const isProd = () => env.NODE_ENV === 'production';

/**
 * Cookie de session de l'espace production (httpOnly JWT typ:'pspace').
 * Même modèle que l'espace journaliste : le cookie ne porte jamais le jeton
 * d'accès brut, seulement un pointeur d'identité relu en base à chaque requête.
 */
export const PSPACE_COOKIE = 'pr360_pspace';

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // calé sur l'expiration du JWT

/** Ouvre une session production : cookie httpOnly (JWT) + cookie CSRF double-submit. */
export function issueProductionSession(res: Response, claims: ProductionSessionClaims): void {
  const secure = isProd();
  res.cookie(PSPACE_COOKIE, signProductionSession(claims), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('base64url'), {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

/** Ferme la session production. */
export function clearProductionSession(res: Response): void {
  const secure = isProd();
  const base = { secure, sameSite: 'lax' as const, path: '/' };
  res.clearCookie(PSPACE_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

/** Claims de la session production depuis le cookie, ou null si absent/invalide. */
export function productionSessionFromReq(req: Request): ProductionSessionClaims | null {
  const token = (req.cookies as Record<string, string> | undefined)?.[PSPACE_COOKIE];
  if (!token) return null;
  try {
    return verifyProductionSession(token);
  } catch {
    return null;
  }
}

export { csrfValid };
