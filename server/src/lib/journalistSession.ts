import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';

/**
 * Session journaliste : cookie HttpOnly posé après échange du lien magique
 * (ou login email/mot de passe). Évite de laisser le bearer 7 jours dans l'URL
 * (historique, logs proxy, forward d'email).
 */
export const JOURNALIST_COOKIE = 'pr360_journalist';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = () => loadEnv().NODE_ENV === 'production';

export function issueJournalistSession(res: Response, token: string): void {
  res.cookie(JOURNALIST_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearJournalistSession(res: Response): void {
  res.clearCookie(JOURNALIST_COOKIE, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
  });
}

export function journalistTokenFromCookie(req: Request): string | undefined {
  const raw = (req.cookies as Record<string, string> | undefined)?.[JOURNALIST_COOKIE];
  return raw && raw.length > 0 ? raw : undefined;
}
