import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Non-régression — croissance mémoire non bornée pilotée par l'appelant (SEC-03).
 *
 * Deux caches étaient indexés par une valeur entièrement choisie côté client :
 * le chemin d'URL (séries de /api/metrics) et l'en-tête `Host` (résolution de
 * domaine personnalisé). Une série de requêtes toutes différentes les faisait
 * croître indéfiniment — déni de service non authentifié (CWE-770).
 */

vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventByCustomDomain: vi.fn(async () => null),
  findEventBySubdomain: vi.fn(async () => null),
}));

describe('SEC-03 — séries de métriques bornées', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgres://u:p@localhost:5432/db',
      JWT_SECRET: originalEnv.JWT_SECRET ?? 'x'.repeat(32),
      NODE_ENV: 'test',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('n’ouvre pas une série par chemin inexistant', async () => {
    const { createApp } = await import('../src/app');
    const { renderMetrics, resetMetricsForTest } = await import('../src/middleware/metrics');
    const request = (await import('supertest')).default;
    const app = createApp();
    resetMetricsForTest();

    for (let i = 0; i < 300; i += 1) {
      await request(app).post(`/chemin-inexistant-${i}`);
    }

    const body = renderMetrics();
    const series = body.split('\n').filter((l) => l.startsWith('http_requests_total{'));
    // Une poignée de séries au lieu d'une par chemin visité.
    expect(series.length).toBeLessThan(20);
    expect(body).not.toContain('chemin-inexistant-42');
    // Les requêtes sont bien comptées, simplement agrégées.
    expect(body).toContain('<non routé>');
  });
});

describe('SEC-03 — cache de résolution d’hôte borné', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgres://u:p@localhost:5432/db',
      JWT_SECRET: originalEnv.JWT_SECRET ?? 'x'.repeat(32),
      NODE_ENV: 'test',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('ne grossit pas indéfiniment sous un flot d’en-têtes Host distincts', async () => {
    const site = await import('../src/services/siteService');

    // 5 000 hôtes différents : sans plafond, autant d'entrées permanentes.
    for (let i = 0; i < 5_000; i += 1) {
      await site.resolveEventForHost(`h${i}.attaquant.test`);
    }

    // On mesure la mémoire réellement retenue par le cache via son comportement :
    // le module ne l'expose pas, donc on vérifie qu'un hôte vu très tôt a été
    // évincé (preuve que le cache a été purgé au lieu de croître).
    const { findEventByCustomDomain } = await import('../src/db/repositories/eventRepo');
    const callsBefore = (findEventByCustomDomain as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    await site.resolveEventForHost('h0.attaquant.test');
    const callsAfter = (findEventByCustomDomain as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it('sert toujours le cache pour un hôte vu juste avant', async () => {
    const site = await import('../src/services/siteService');
    const { findEventByCustomDomain } = await import('../src/db/repositories/eventRepo');
    const mock = findEventByCustomDomain as unknown as { mock: { calls: unknown[] } };

    await site.resolveEventForHost('presse.client.test');
    const calls = mock.mock.calls.length;
    await site.resolveEventForHost('presse.client.test');
    expect(mock.mock.calls.length).toBe(calls);
  });
});
