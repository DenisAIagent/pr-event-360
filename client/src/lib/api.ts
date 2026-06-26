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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
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

export const api = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: unknown, token?: string) => request<T>('PUT', path, body, token),
  del: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
};
