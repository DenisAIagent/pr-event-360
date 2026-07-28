import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../http/AppError';
import { sendError } from '../http/respond';
import { loadEnv } from '../config/env';
import { captureError } from '../lib/sentry';

const env = loadEnv();

/**
 * Codes d'erreur PostgreSQL « faute du client » (classe 22 — data exception).
 * Sans ce mappage, un UUID malformé dans l'URL remonte en 500 alors qu'il s'agit
 * d'une requête invalide : bruit dans Sentry et oracle de comportement côté attaquant.
 */
const PG_CLIENT_ERRORS: Record<string, string> = {
  '22P02': 'Identifiant ou valeur invalide', // invalid_text_representation (UUID, enum, entier…)
  '22001': 'Valeur trop longue', //             string_data_right_truncation
  '22003': 'Valeur numérique hors limites', //  numeric_value_out_of_range
  '22007': 'Format de date invalide', //        invalid_datetime_format
  '22008': 'Date hors limites', //              datetime_field_overflow
};

/** Erreur body-parser (JSON malformé, corps trop volumineux) : `type` + `status` portés par l'erreur. */
interface BodyParserError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
}

function asBodyParserError(err: unknown): BodyParserError | null {
  if (!(err instanceof Error)) return null;
  const e = err as BodyParserError;
  return typeof e.type === 'string' && e.type.startsWith('entity.') ? e : null;
}

function pgCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Motif de route paramétré (`/api/admin/events/:eventId/accreditations/:journalistId`)
 * plutôt que l'URL réelle. Évite d'envoyer à Sentry les jetons présents dans les
 * chemins (espace journaliste, magic-link, réinitialisation) en cas de 500.
 * Repli : chemin expurgé si la route n'a pas été résolue (erreur en amont du routage).
 */
export function routePattern(req: Request): string {
  const routePath = (req as Request & { route?: { path?: string } }).route?.path;
  if (routePath) return `${req.baseUrl}${routePath === '/' ? '' : routePath}` || '/';
  return redactPath(req.path);
}

/** Remplace les segments sensibles (UUID, jetons opaques) par des marqueurs. */
export function redactPath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':uuid';
      // Jetons opaques (reset, magic-link, invitation) : ≥ 24 caractères sans séparateur lisible.
      if (seg.length >= 24 && /^[A-Za-z0-9_-]+$/.test(seg)) return ':token';
      return seg;
    })
    .join('/');
}

/** Gestionnaire d'erreurs central. Doit être monté EN DERNIER. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    sendError(res, 400, 'Données invalides', err.issues);
    return;
  }
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.details);
    return;
  }

  // Corps de requête illisible : JSON malformé (400), trop volumineux (413),
  // charset/encodage non supporté (415). Fautes du client, jamais des 500.
  const bodyErr = asBodyParserError(err);
  if (bodyErr) {
    const status = bodyErr.status ?? bodyErr.statusCode ?? 400;
    const message =
      bodyErr.type === 'entity.too.large'
        ? 'Corps de requête trop volumineux'
        : bodyErr.type === 'entity.parse.failed'
          ? 'JSON invalide'
          : 'Requête invalide';
    sendError(res, status >= 400 && status < 500 ? status : 400, message);
    return;
  }

  // Valeur rejetée par PostgreSQL (UUID malformé dans l'URL, entier hors limites…).
  const code = pgCode(err);
  if (code && PG_CLIENT_ERRORS[code]) {
    sendError(res, 400, PG_CLIENT_ERRORS[code]!);
    return;
  }

  // Erreur inattendue : on logue le détail côté serveur, on reste sobre côté client.
  // Remontée à Sentry si configuré (les erreurs métier AppError/Zod ne le sont pas).
  console.error('[unhandled]', err);
  captureError(err, { method: req.method, route: routePattern(req) });
  const message =
    env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : String((err as Error)?.message ?? err);
  sendError(res, 500, message);
}

/** 404 pour toute route non gérée. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'Route introuvable');
}
