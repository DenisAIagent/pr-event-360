import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

/**
 * En-têtes de sécurité émis par l'application (Helmet).
 *
 * Garde-fou de régression pour le durcissement CSP : `frame-ancestors` (anti
 * clickjacking) et `form-action` (un POST ne peut cibler que notre origine)
 * doivent rester dans la politique, en plus des directives historiques.
 * L'en-tête est posé par le middleware avant toute route : une 404 le porte
 * donc, sans dépendance à la base.
 */
describe('En-têtes de sécurité (CSP)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgres://u:p@localhost:5432/db',
      JWT_SECRET: originalEnv.JWT_SECRET ?? 'x'.repeat(32),
      NODE_ENV: 'production',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('inclut frame-ancestors, form-action et les directives de base dans la CSP', async () => {
    const { createApp } = await import('../src/app');
    const request = (await import('supertest')).default;
    const res = await request(createApp()).get('/api/__csp_probe__');
    const csp = res.headers['content-security-policy'];
    expect(csp, 'aucune CSP émise').toBeTruthy();
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("form-action 'self'");
    // Directives historiques : ne pas les perdre au passage.
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it('conserve HSTS preload en production', async () => {
    const { createApp } = await import('../src/app');
    const request = (await import('supertest')).default;
    const res = await request(createApp()).get('/api/__csp_probe__');
    expect(res.headers['strict-transport-security']).toContain('preload');
  });
});
