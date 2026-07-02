/** Client HTTP minimal vers l'API. Déballe l'enveloppe { success, data, error }. */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

const BASE = '/api';

/** Lit un cookie non-httpOnly (ici le jeton CSRF déposé à l'ouverture de session). */
function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : undefined;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Repli Bearer (clients/tests) — l'auth normale du navigateur passe par le cookie de session.
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Double-submit CSRF : on rejoue le cookie CSRF en en-tête sur les requêtes mutantes.
  if (MUTATING.has(method)) {
    const csrf = readCookie('pr360_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      // Envoie/reçoit les cookies de session (même origine en prod, cross-origin en dev via CORS credentials).
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Réseau indisponible');
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    /* réponse sans corps JSON */
  }

  if (!res.ok || !payload?.success) {
    throw new ApiError(res.status, payload?.error ?? `Erreur ${res.status}`, payload?.details);
  }
  return payload.data as T;
}

// Dé-duplication des GET « en vol » : quand plusieurs composants demandent la MÊME URL
// simultanément (ex. barre du haut + page au montage), une seule requête réseau part et la
// promesse est partagée. Aucune mise en cache dans le temps → zéro risque de données périmées.
const inflightGets = new Map<string, Promise<unknown>>();

function dedupGet<T>(path: string, token?: string): Promise<T> {
  const key = `${token ? 'a' : 'p'}:${path}`;
  const existing = inflightGets.get(key);
  if (existing) return existing as Promise<T>;
  const p = request<T>('GET', path, undefined, token).finally(() => inflightGets.delete(key));
  inflightGets.set(key, p);
  return p as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string) => dedupGet<T>(path, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: unknown, token?: string) => request<T>('PUT', path, body, token),
  del: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
};
