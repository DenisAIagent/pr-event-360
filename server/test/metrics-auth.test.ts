import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

/**
 * Protection de /api/metrics : en production sans METRICS_TOKEN → 404 ;
 * avec token → Bearer requis.
 */
describe('GET /api/metrics — contrôle d’accès', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgres://u:p@localhost:5432/db',
      JWT_SECRET: originalEnv.JWT_SECRET ?? 'x'.repeat(32),
      NODE_ENV: 'production',
    };
    delete process.env.METRICS_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('renvoie 404 en production sans METRICS_TOKEN', async () => {
    const { createApp } = await import('../src/app');
    const request = (await import('supertest')).default;
    const res = await request(createApp()).get('/api/metrics');
    expect(res.status).toBe(404);
  });

  it('exige le Bearer lorsque METRICS_TOKEN est défini', async () => {
    process.env.METRICS_TOKEN = 'metrics-secret-token-32chars!!';
    vi.resetModules();
    const { createApp } = await import('../src/app');
    const request = (await import('supertest')).default;
    const app = createApp();

    const denied = await request(app).get('/api/metrics');
    expect(denied.status).toBe(401);

    const ok = await request(app)
      .get('/api/metrics')
      .set('Authorization', 'Bearer metrics-secret-token-32chars!!');
    expect(ok.status).toBe(200);
    expect(ok.text).toContain('http_requests_total');
  });
});
