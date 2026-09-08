import { describe, expect, it, afterEach } from 'vitest';
import express from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import request from 'supertest';
import { createLimiterStore, __setRedisClientForTest } from '../src/lib/rateLimitStore';

/**
 * Régression OPS-02 : quand REDIS_URL est configuré, chaque limiteur doit avoir
 * SON propre store (express-rate-limit v7 interdit de partager une instance —
 * ERR_ERL_STORE_REUSE) et SON propre préfixe de clé (sinon deux limiteurs par IP
 * partagent le compteur). L'ancien code exposait un singleton partagé, ce qui
 * cassait l'activation de Redis en production.
 */

/** Faux client Redis : capture les clés vues et pilote la valeur/erreur renvoyée. */
function fakeRedis(behavior: { keys: string[]; hits?: number; throwOnEval?: boolean }) {
  return {
    eval: async (_script: unknown, _n: unknown, key: string) => {
      behavior.keys.push(key);
      if (behavior.throwOnEval) throw new Error('redis down');
      return [behavior.hits ?? 1, 60_000];
    },
    pexpire: async () => 1,
    del: async () => 1,
    on: () => undefined,
  };
}

afterEach(() => {
  __setRedisClientForTest(null);
});

describe('createLimiterStore — préfixe par limiteur (chemin Redis)', () => {
  it('préfixe les clés Redis distinctement selon le nom du limiteur', async () => {
    const seen: string[] = [];
    __setRedisClientForTest(fakeRedis({ keys: seen }));

    const app = express();
    app.get(
      '/a',
      rateLimit({
        windowMs: 60_000,
        limit: 100,
        store: createLimiterStore({ scope: 'general', name: 'alpha' }),
        keyGenerator: () => 'K',
      }),
      (_req, res) => res.json({ ok: true }),
    );
    app.get(
      '/b',
      rateLimit({
        windowMs: 60_000,
        limit: 100,
        store: createLimiterStore({ scope: 'general', name: 'beta' }),
        keyGenerator: () => 'K',
      }),
      (_req, res) => res.json({ ok: true }),
    );

    await request(app).get('/a').expect(200);
    await request(app).get('/b').expect(200);

    expect(seen).toContain('rl:alpha:K');
    expect(seen).toContain('rl:beta:K');
  });
});

describe('createLimiterStore — pas de partage d’instance (ERR_ERL_STORE_REUSE)', () => {
  it('permet deux limiteurs distincts sans erreur et compte indépendamment', async () => {
    __setRedisClientForTest(null); // pas de Redis → MemoryStore propre à chaque limiteur

    const app = express();
    // Construire deux limiteurs à la suite ne doit PAS lever ERR_ERL_STORE_REUSE.
    const mk = (name: string) =>
      rateLimit({
        windowMs: 60_000,
        limit: 2,
        store: createLimiterStore({ scope: 'general', name }),
        keyGenerator: () => 'shared-ip',
        handler: (_req, res) => res.status(429).json({ limited: true }),
      });
    app.get('/x', mk('x'), (_req, res) => res.json({ ok: true }));
    app.get('/y', mk('y'), (_req, res) => res.json({ ok: true }));

    // Chaque route a son propre compteur (préfixe distinct) : /x épuisé n'affecte pas /y.
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(429);
    await request(app).get('/y').expect(200); // indépendant
    await request(app).get('/y').expect(200);
    await request(app).get('/y').expect(429);
  });
});

describe('createLimiterStore — fail-open (général) vs fail-closed (auth) via le store paresseux', () => {
  it('auth : si Redis échoue, la requête est bloquée (429)', async () => {
    __setRedisClientForTest(fakeRedis({ keys: [], throwOnEval: true }));
    const app = express();
    app.get(
      '/auth',
      rateLimit({
        windowMs: 60_000,
        limit: 5,
        store: createLimiterStore({ scope: 'auth', name: 'auth-test' }),
        keyGenerator: () => 'ip',
        handler: (_req, res) => res.status(429).json({ limited: true }),
      }),
      (_req, res) => res.json({ ok: true }),
    );
    await request(app).get('/auth').expect(429); // fail-closed
  });

  it('général : si Redis échoue, la requête passe (fail-open)', async () => {
    __setRedisClientForTest(fakeRedis({ keys: [], throwOnEval: true }));
    const app = express();
    app.get(
      '/gen',
      rateLimit({
        windowMs: 60_000,
        limit: 5,
        store: createLimiterStore({ scope: 'general', name: 'gen-test' }),
        keyGenerator: () => 'ip',
        handler: (_req, res) => res.status(429).json({ limited: true }),
      }),
      (_req, res) => res.json({ ok: true }),
    );
    await request(app).get('/gen').expect(200); // fail-open
  });
});

// Garde le type Options importé (utilisé par la signature init du store).
export type _Options = Options;
