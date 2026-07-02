import type { APIRequestContext, Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_EMAIL ?? 'demo@pr-event-360.local';
export const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? 'DemoEvent360!';

export interface Auth {
  /** Jeton CSRF (double-submit) à renvoyer en en-tête sur les requêtes mutantes. */
  csrf: string;
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

/**
 * Connexion via l'API (rapide). La session est posée en cookie httpOnly sur le
 * contexte de requêtes (le token n'est plus renvoyé dans le JSON) ; on récupère le
 * jeton CSRF (cookie lisible, pattern double-submit) pour les requêtes mutantes.
 */
export async function apiLogin(request: APIRequestContext): Promise<Auth> {
  const res = await request.post('/api/admin/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = (await unwrap(res)) as { user: Record<string, unknown> };
  const { cookies } = await request.storageState();
  const csrf = cookies.find((c) => c.name === 'pr360_csrf')?.value;
  if (!csrf) throw new Error(`Login sans cookie CSRF (MFA ?) : ${JSON.stringify(data)}`);
  return { csrf, user: data.user };
}

/** Connexion via le formulaire (pose le cookie de session httpOnly dans le contexte du navigateur). */
export async function uiLogin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForURL('**/admin');
}

/**
 * Appel API authentifié renvoyant le payload déballé. La session voyage via le
 * cookie httpOnly du contexte ; le jeton CSRF est renvoyé en en-tête (double-submit).
 */
export async function api(
  request: APIRequestContext,
  csrf: string,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  data?: unknown,
): Promise<unknown> {
  const res = await request[method](`/api${path}`, {
    headers: { 'x-csrf-token': csrf },
    ...(data !== undefined ? { data } : {}),
  });
  return unwrap(res);
}
