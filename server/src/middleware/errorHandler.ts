import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../http/AppError';
import { sendError } from '../http/respond';
import { loadEnv } from '../config/env';

const env = loadEnv();

/** Gestionnaire d'erreurs central. Doit être monté EN DERNIER. */
export function errorHandler(
  err: unknown,
  _req: Request,
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

  // Erreur inattendue : on logue le détail côté serveur, on reste sobre côté client.
  console.error('[unhandled]', err);
  const message =
    env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : String((err as Error)?.message ?? err);
  sendError(res, 500, message);
}

/** 404 pour toute route non gérée. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'Route introuvable');
}
