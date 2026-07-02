import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';

const env = loadEnv();

/** Cookie de session : porte le JWT, INACCESSIBLE au JavaScript (httpOnly) → non volable par XSS. */
export const SESSION_COOKIE = 'pr360_session';
/** Cookie CSRF : lisible par le JS du front (double-submit), rejoué en en-tête X-CSRF-Token. */
export const CSRF_COOKIE = 'pr360_csrf';
export const CSRF_HEADER = 'x-csrf-token';

// Le JWT expire en 12 h ; on cale la durée de vie des cookies dessus.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const isProd = env.NODE_ENV === 'production';

/**
 * Ouvre une session : pose le cookie httpOnly (JWT) + un cookie CSRF lisible.
 * `SameSite=Lax` (les GET de navigation top-level passent, les POST cross-site sont bloqués)
 * combiné au double-submit CSRF = protection standard robuste.
 */
export function issueSession(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('base64url'), {
    httpOnly: false, // le front doit pouvoir le lire pour le renvoyer en en-tête
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

/** Ferme la session : efface les deux cookies. */
export function clearSession(res: Response): void {
  const opts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
  res.clearCookie(SESSION_COOKIE, opts);
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false });
}

/** Lit le JWT depuis le cookie de session (undefined si absent). */
export function sessionTokenFromCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}

/**
 * Vérifie le jeton CSRF (double-submit) : l'en-tête X-CSRF-Token doit égaler le cookie CSRF.
 * Un site tiers ne peut ni lire le cookie de la victime, ni forger cet en-tête cross-site.
 * Comparaison à temps constant.
 */
export function csrfValid(req: Request): boolean {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
