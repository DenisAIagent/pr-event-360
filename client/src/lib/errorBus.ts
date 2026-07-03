import { ApiError } from './api';

/**
 * Informations d'un incident, prêtes à être notifiées et COPIÉES par l'utilisateur
 * pour transmission au support. Le `code` + `requestId` permettent de retrouver la
 * trace exacte côté serveur.
 */
export interface ErrorInfo {
  message: string;
  code: string;
  requestId?: string;
  status?: number;
  time: string; // ISO
  page: string; // URL courante
}

/** Construit un ErrorInfo à partir d'une erreur (ApiError enrichie, ou erreur JS). */
export function buildErrorInfo(err: unknown): ErrorInfo {
  const time = new Date().toISOString();
  const page = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
  if (err instanceof ApiError) {
    return {
      message: err.message,
      code: err.code ?? (err.status === 0 ? 'PRE-0000' : `PRE-${err.status}`),
      requestId: err.requestId,
      status: err.status,
      time,
      page,
    };
  }
  return {
    message: err instanceof Error ? err.message : 'Erreur inattendue',
    code: 'PRE-0001',
    time,
    page,
  };
}

/** Texte prêt à coller (à transmettre au support) résumant l'incident. */
export function formatErrorDetails(info: ErrorInfo): string {
  return [
    `Code : ${info.code}`,
    info.requestId ? `Requête : ${info.requestId}` : null,
    `Heure : ${info.time}`,
    `Page : ${info.page}`,
    `Message : ${info.message}`,
  ]
    .filter(Boolean)
    .join('\n');
}

type Listener = (info: ErrorInfo) => void;
const listeners = new Set<Listener>();

/** S'abonne aux incidents (utilisé par la notification globale). Renvoie un désabonnement. */
export function onError(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Émet un incident vers la notification globale. */
export function emitError(info: ErrorInfo): void {
  for (const fn of listeners) fn(info);
}

/** Émet un incident à partir d'une erreur brute (raccourci). */
export function reportError(err: unknown): ErrorInfo {
  const info = buildErrorInfo(err);
  emitError(info);
  return info;
}
