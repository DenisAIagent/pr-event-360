import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { APIRequestContext, Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_EMAIL ?? 'demo@pr-event-360.local';
export const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? 'DemoEvent360!';

export interface Auth {
  /** Jeton CSRF (double-submit) à renvoyer en en-tête sur les requêtes mutantes. */
  csrf: string;
  user: Record<string, unknown>;
}

// ── TOTP (miroir de server/src/lib/totp.ts) ─────────────────────────
// Les comptes à privilèges (admin/super-admin) ont la MFA OBLIGATOIRE : les tests
// enrôlent la MFA via l'API et génèrent les codes TOTP. Le secret est persisté dans
// un fichier temp (Playwright peut relancer un worker par fichier → un cache mémoire
// ne survivrait pas entre specs).
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET_FILE = path.join(
  os.tmpdir(),
  `pr360-e2e-mfa-${crypto.createHash('sha256').update(ADMIN_EMAIL).digest('hex').slice(0, 12)}.txt`,
);
let cachedSecret: string | null = null;

function saveSecret(secret: string): void {
  cachedSecret = secret;
  fs.writeFileSync(SECRET_FILE, secret, 'utf8');
}

function loadSecret(): string | null {
  if (cachedSecret) return cachedSecret;
  try {
    cachedSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim() || null;
  } catch {
    cachedSecret = null;
  }
  return cachedSecret;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totp(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/** Déballe l'enveloppe { success, data } de l'API. */
async function unwrap(res: import('@playwright/test').APIResponse): Promise<unknown> {
  const body = await res.json();
  if (!res.ok() || body?.success === false) {
    throw new Error(`API ${res.status()} : ${JSON.stringify(body)}`);
  }
  return body?.data ?? body;
}

async function csrfFrom(request: APIRequestContext): Promise<string> {
  const { cookies } = await request.storageState();
  const csrf = cookies.find((c) => c.name === 'pr360_csrf')?.value;
  if (!csrf) throw new Error('Login sans cookie CSRF');
  return csrf;
}

/** Enrôle la MFA (setup → code TOTP → enable) et met le secret en cache. */
async function enrollMfa(request: APIRequestContext, csrf: string): Promise<void> {
  const setup = (await unwrap(
    await request.post('/api/admin/auth/mfa/setup', { headers: { 'x-csrf-token': csrf } }),
  )) as { otpauth: string };
  const secret = /secret=([A-Z2-7]+)/i.exec(setup.otpauth)?.[1];
  if (!secret) throw new Error(`Secret MFA introuvable dans otpauth : ${setup.otpauth}`);
  saveSecret(secret);
  await unwrap(
    await request.post('/api/admin/auth/mfa/enable', {
      headers: { 'x-csrf-token': csrf },
      data: { code: totp(secret) },
    }),
  );
}

/**
 * Connexion via l'API. Gère la MFA obligatoire des comptes à privilèges :
 * enrôlement au premier login, puis échange challenge + code TOTP aux suivants.
 * La session est en cookie httpOnly ; on renvoie le jeton CSRF (double-submit).
 */
export async function apiLogin(request: APIRequestContext): Promise<Auth> {
  const res = await request.post('/api/admin/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = (await unwrap(res)) as
    | { user: Record<string, unknown>; mfaSetupRequired?: boolean }
    | { mfaRequired: true; challenge: string };

  // MFA déjà active : échange le challenge contre un code TOTP (secret persisté).
  if ('mfaRequired' in data) {
    const secret = loadSecret();
    if (!secret) throw new Error('MFA requise mais aucun secret enrôlé (fichier temp absent)');
    const done = (await unwrap(
      await request.post('/api/admin/auth/login/mfa', {
        data: { challenge: data.challenge, code: totp(secret) },
      }),
    )) as { user: Record<string, unknown> };
    return { csrf: await csrfFrom(request), user: done.user };
  }

  const csrf = await csrfFrom(request);
  // MFA obligatoire pas encore activée : on l'enrôle (le serveur bloque le reste sinon).
  if (data.mfaSetupRequired) await enrollMfa(request, csrf);
  return { csrf, user: data.user };
}

/**
 * Connexion via le formulaire (pose le cookie de session dans le contexte du navigateur).
 * Franchit l'étape MFA si elle apparaît (compte à privilèges déjà enrôlé via apiLogin).
 */
export async function uiLogin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();

  // Après le mot de passe, deux issues possibles : l'étape code MFA (compte à
  // privilèges) ou directement le tableau de bord (compte exempté). On attend l'une
  // OU l'autre (le champ code peut mettre un instant à apparaître après le POST login).
  const codeInput = page.locator('input[autocomplete="one-time-code"]');
  await Promise.race([
    codeInput.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined),
    page.waitForURL('**/admin', { timeout: 10_000 }).catch(() => undefined),
  ]);

  if (await codeInput.isVisible().catch(() => false)) {
    const secret = loadSecret();
    if (!secret) throw new Error('Étape MFA UI mais aucun secret enrôlé');
    const verify = page.getByRole('button', { name: 'Vérifier' });
    await codeInput.fill(totp(secret));
    await verify.click();
  }
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
