import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Non-régression — bruteforce du second facteur (SEC-01).
 *
 * Avant correction, `POST /api/admin/auth/login/mfa` n'était plafonné que par
 * IP : le challenge MFA étant un JWT sans état rejouable 5 minutes, un pool
 * d'adresses multipliait le quota et rendait les 10^6 codes TOTP atteignables
 * pour un attaquant possédant déjà le mot de passe. Ces tests vérifient qu'un
 * plafond indexé sur le COMPTE (et donc insensible à la rotation d'IP) bloque
 * désormais la série, sans pénaliser les autres comptes.
 */

// completeMfaLogin échoue systématiquement : on simule un attaquant qui essaie
// des codes au hasard. Le reste du service n'est pas sollicité par ces routes.
vi.mock('../src/services/authService', () => ({
  login: vi.fn(),
  registerUser: vi.fn(),
  completeMfaLogin: vi.fn(async () => {
    const { AppError } = await import('../src/http/AppError');
    throw AppError.unauthorized('Code de double authentification incorrect.');
  }),
}));

const JWT_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

describe('SEC-01 — anti-bruteforce TOTP indexé sur le compte', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgres://u:p@localhost:5432/db',
      JWT_SECRET,
      // `trust proxy` n'est activé qu'en production : indispensable pour que
      // X-Forwarded-For fasse réellement varier req.ip dans ce test.
      NODE_ENV: 'production',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  async function harness() {
    const { createApp } = await import('../src/app');
    const { signMfaChallenge } = await import('../src/lib/jwt');
    const request = (await import('supertest')).default;
    return { app: createApp(), signMfaChallenge, request };
  }

  const attempt = (
    request: Awaited<ReturnType<typeof harness>>['request'],
    app: unknown,
    challenge: string,
    ip: string,
  ) =>
    request(app as never)
      .post('/api/admin/auth/login/mfa')
      .set('X-Forwarded-For', ip)
      .send({ challenge, code: '000000' });

  it('bloque la série même si chaque tentative vient d’une IP différente', async () => {
    const { app, signMfaChallenge, request } = await harness();
    const challenge = signMfaChallenge('11111111-1111-4111-8111-111111111111');

    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      // Une IP distincte par tentative : le plafond par IP ne peut pas se déclencher.
      const res = await attempt(request, app, challenge, `203.0.113.${i + 1}`);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('n’impacte pas un autre compte depuis les mêmes IP', async () => {
    const { app, signMfaChallenge, request } = await harness();
    const victime = signMfaChallenge('11111111-1111-4111-8111-111111111111');
    const autre = signMfaChallenge('22222222-2222-4222-8222-222222222222');

    for (let i = 0; i < 6; i += 1) {
      await attempt(request, app, victime, `198.51.100.${i + 1}`);
    }
    expect((await attempt(request, app, victime, '198.51.100.9')).status).toBe(429);

    // Le compteur est bien porté par le compte, pas par l'IP ni globalement.
    expect((await attempt(request, app, autre, '198.51.100.1')).status).toBe(401);
  });

  it('reste borné quand le challenge est absent ou forgé (repli sur l’IP)', async () => {
    const { app, request } = await harness();

    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await request(app as never)
        .post('/api/admin/auth/login/mfa')
        .set('X-Forwarded-For', '192.0.2.42')
        .send({ challenge: 'jeton.forge.invalide', code: '000000' });
      statuses.push(res.status);
    }

    // Un challenge non signé ne permet pas de choisir sa clé de comptage :
    // le repli sur l'IP plafonne quand même la série.
    expect(statuses).toContain(429);
  });
});
