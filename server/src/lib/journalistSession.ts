import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { CSRF_COOKIE, csrfValid } from './session';
import { signJournalistSession, verifyJournalistSession, type JournalistSessionClaims } from './jwt';

const env = loadEnv();
const isProd = env.NODE_ENV === 'production';

/** Cookie de session de l'espace journaliste (httpOnly → non volable par XSS). */
export const JSPACE_COOKIE = 'pr360_jspace';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 j, calé sur l'expiration du JWT

/**
 * Ouvre une session journaliste : pose le cookie httpOnly (JWT) + le cookie CSRF
 * lisible (double-submit, partagé avec le back-office — un navigateur n'est pas
 * admin ET journaliste simultanément). Remplace le token permanent dans l'URL.
 */
export function issueJournalistSession(res: Response, claims: JournalistSessionClaims): void {
  res.cookie(JSPACE_COOKIE, signJournalistSession(claims), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('base64url'), {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

/** Ferme la session journaliste. */
export function clearJournalistSession(res: Response): void {
  const opts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
  res.clearCookie(JSPACE_COOKIE, opts);
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false });
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
