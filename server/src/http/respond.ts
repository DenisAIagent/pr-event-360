import type { Response } from 'express';

/** Enveloppe de réponse cohérente pour toute l'API. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export function sendData<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  details?: unknown,
): void {
  const body: ApiError = { success: false, error, ...(details ? { details } : {}) };
  res.status(statusCode).json(body);
}
