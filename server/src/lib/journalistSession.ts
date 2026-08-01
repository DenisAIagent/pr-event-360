import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { CSRF_COOKIE, csrfValid } from './session';
import {
  signJournalistSession,
  verifyJournalistSession,
  type JournalistSessionClaims,
} from './jwt';

const env = loadEnv();
const isProd = () => env.NODE_ENV === 'production';

/**
 * Cookie de session de l'espace journaliste (httpOnly JWT typ:'jspace').
 * Ne contient plus le bearer d'accès brut : une fuite du cookie ne donne plus
 * un lien magique rejouable hors de sa fenêtre d'expiration JWT.
 */
export const JSPACE_COOKIE = 'pr360_jspace';
/** Ancien cookie (bearer brut) — purgé à l'émission/fermeture de session. */
export const LEGACY_JOURNALIST_COOKIE = 'pr360_journalist';

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 j, calé sur l'expiration du JWT

/**
 * Ouvre une session journaliste : cookie httpOnly (JWT) + cookie CSRF double-submit
 * (partagé avec le back-office — un navigateur n'est en pratique pas admin ET
 * journaliste simultanément).
 */
export function issueJournalistSession(res: Response, claims: JournalistSessionClaims): void {
  const secure = isProd();
  res.cookie(JSPACE_COOKIE, signJournalistSession(claims), {
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
  // Purge de l'ancien cookie bearer brut s'il trainait encore.
  res.clearCookie(LEGACY_JOURNALIST_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });
}

/** Ferme la session journaliste (JWT + CSRF + legacy). */
export function clearJournalistSession(res: Response): void {
  const secure = isProd();
  const base = { secure, sameSite: 'lax' as const, path: '/' };
  res.clearCookie(JSPACE_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(LEGACY_JOURNALIST_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

/** Claims de la session journaliste depuis le cookie, ou null si absent/invalide. */
export function journalistSessionFromReq(req: Request): JournalistSessionClaims | null {
  const token = (req.cookies as Record<string, string> | undefined)?.[JSPACE_COOKIE];
  if (!token) return null;
  try {
    return verifyJournalistSession(token);
  } catch {
    return null;
  }
}

export { csrfValid };
