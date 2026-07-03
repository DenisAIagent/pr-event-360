import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../http/AppError';
import { sendError } from '../http/respond';
import { ERROR_CODES, defaultCodeForStatus } from '../http/errorCodes';
import { loadEnv } from '../config/env';
import { captureError } from '../lib/sentry';

const env = loadEnv();

/** Journalise une erreur de façon structurée (grep-able) avec son code + requestId. */
function logError(level: 'warn' | 'error', req: Request, status: number, code: string, message: string): void {
  const line = `[error] code=${code} status=${status} requestId=${req.id ?? '-'} ${req.method} ${req.path} :: ${message}`;
  if (level === 'error') console.error(line);
  else console.warn(line);
}

/** Gestionnaire d'erreurs central. Doit être monté EN DERNIER. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.id;

  if (err instanceof ZodError) {
    const code = ERROR_CODES.VALIDATION;
    logError('warn', req, 400, code, 'validation');
    sendError(res, 400, 'Données invalides', { code, requestId, details: err.issues });
    return;
  }

  if (err instanceof AppError) {
    const code = err.code ?? defaultCodeForStatus(err.statusCode);
    // 4xx = erreurs attendues (warn) ; 5xx = anormal (error + Sentry).
    logError(err.statusCode >= 500 ? 'error' : 'warn', req, err.statusCode, code, err.message);
    if (err.statusCode >= 500) captureError(err, { method: req.method, path: req.path, requestId });
    sendError(res, err.statusCode, err.message, { code, requestId, details: err.details });
    return;
  }

  // Erreur inattendue : détail loggé côté serveur, message sobre côté client (pas de fuite).
  // Le requestId + le code PRE-5000 permettent au support de retrouver la trace exacte.
  const code = ERROR_CODES.INTERNAL;
  logError('error', req, 500, code, String((err as Error)?.message ?? err));
  captureError(err, { method: req.method, path: req.path, requestId });
  const message =
    env.NODE_ENV === 'production' ? 'Une erreur interne est survenue.' : String((err as Error)?.message ?? err);
  sendError(res, 500, message, { code, requestId });
}

/** 404 pour toute route non gérée. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'Route introuvable', { code: ERROR_CODES.NOT_FOUND, requestId: req.id });
}
