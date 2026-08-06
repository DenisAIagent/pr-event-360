import { describe, expect, it, vi } from 'vitest';
import {
  authRateLimitKey,
  createFailClosedStoreForTest,
} from '../src/lib/rateLimitStore';

describe('PW-05 — clés de rate-limit auth', () => {
  it('normalise l’email (casse et espaces)', () => {
    const a = authRateLimitKey('login', '1.2.3.4', '  Admin@Example.COM ');
    const b = authRateLimitKey('login', '1.2.3.4', 'admin@example.com');
    expect(a).toBe(b);
    expect(a).toBe('login:1.2.3.4:admin@example.com');
  });

  it('retombe sur l’IP seule si email absent', () => {
    expect(authRateLimitKey('login', '10.0.0.1', undefined)).toBe('login:10.0.0.1');
    expect(authRateLimitKey('login', undefined, null)).toBe('login:unknown');
  });

  it('sépare les préfixes login / reset / mfa', () => {
    const email = 'a@b.c';
    expect(authRateLimitKey('login', '1.1.1.1', email)).not.toBe(
      authRateLimitKey('reset', '1.1.1.1', email),
    );
  });
});

describe('PW-05 — store auth fail-closed', () => {
  it('renvoie un totalHits bloquant si l’incrément Redis échoue', async () => {
    const inner = {
      windowMs: 60_000,
      init: vi.fn(),
      increment: vi.fn(async () => {
        throw new Error('redis down');
      }),
      decrement: vi.fn(async () => undefined),
      resetKey: vi.fn(async () => undefined),
    };
    const store = createFailClosedStoreForTest(inner);
    store.init?.({ windowMs: 90_000 });
    const info = await store.increment!('login:1.1.1.1:x@y.com');
    expect(info.totalHits).toBeGreaterThan(1_000_000);
    expect(info.resetTime).toBeInstanceOf(Date);
  });

  it('propage le compteur si Redis répond', async () => {
    const inner = {
      windowMs: 60_000,
      init: vi.fn(),
      increment: vi.fn(async () => ({ totalHits: 3, resetTime: new Date(Date.now() + 1000) })),
      decrement: vi.fn(async () => undefined),
      resetKey: vi.fn(async () => undefined),
    };
    const store = createFailClosedStoreForTest(inner);
    const info = await store.increment!('login:1.1.1.1:x@y.com');
    expect(info.totalHits).toBe(3);
  });
});
