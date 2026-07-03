import type { Response } from 'express';

/** Enveloppe de réponse cohérente pour toute l'API. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: string;
  /** Code d'erreur stable (`PRE-####`) : identifiable côté client et traçable côté serveur. */
  code?: string;
  /** Identifiant de la requête : corrèle la notification client aux logs serveur. */
  requestId?: string;
  details?: unknown;
}

export function sendData<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export interface ErrorMeta {
  code?: string;
  requestId?: string;
  details?: unknown;
}

export function sendError(res: Response, statusCode: number, error: string, meta: ErrorMeta = {}): void {
  const body: ApiError = {
    success: false,
    error,
    ...(meta.code ? { code: meta.code } : {}),
    ...(meta.requestId ? { requestId: meta.requestId } : {}),
    ...(meta.details ? { details: meta.details } : {}),
  };
  res.status(statusCode).json(body);
}
