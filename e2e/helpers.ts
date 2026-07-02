import type { APIRequestContext, Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_EMAIL ?? 'demo@pr-event-360.local';
export const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? 'DemoEvent360!';

export interface Auth {
  token: string;
  user: Record<string, unknown>;
}

/** Déballe l'enveloppe { success, data } de l'API. */
async function unwrap(res: import('@playwright/test').APIResponse): Promise<unknown> {
  const body = await res.json();
  if (!res.ok() || body?.success === false) {
    throw new Error(`API ${res.status()} : ${JSON.stringify(body)}`);
  }
  return body?.data ?? body;
}

/** Connexion via l'API (rapide) → jeton + user, pour préparer les fixtures et injecter la session. */
export async function apiLogin(request: APIRequestContext): Promise<Auth> {
  const res = await request.post('/api/admin/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = (await unwrap(res)) as Auth;
  if (!data.token) throw new Error(`Login sans jeton (MFA ?) : ${JSON.stringify(data)}`);
  return data;
}

/** Connexion via le formulaire (pose le cookie de session httpOnly dans le contexte du navigateur). */
export async function uiLogin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForURL('**/admin');
}

/** Appel API authentifié renvoyant le payload déballé. */
export async function api(
  request: APIRequestContext,
  token: string,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  data?: unknown,
): Promise<unknown> {
  const res = await request[method](`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data !== undefined ? { data } : {}),
  });
  return unwrap(res);
}
