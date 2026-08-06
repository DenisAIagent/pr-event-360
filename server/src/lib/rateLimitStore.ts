import type { Store, ClientRateLimitInfo } from 'express-rate-limit';
import { loadEnv } from '../config/env';

/**
 * Store Redis pour express-rate-limit : compteurs de débit PARTAGÉS entre
 * instances (sinon chaque replica compte localement et la limite effective est
 * multipliée par N — y compris l'anti-bruteforce du login).
 *
 * - Routes générales : FAIL OPEN si Redis tombe (disponibilité).
 * - Routes auth (login / MFA / reset) : FAIL CLOSED (compte comme quota atteint)
 *   pour ne jamais rouvrir le bruteforce pendant une panne Redis.
 */

interface RedisLike {
  eval(...args: unknown[]): Promise<unknown>;
  pexpire(key: string, ms: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  on(event: string, cb: (err: unknown) => void): unknown;
}

let client: RedisLike | null = null;
let clientFailed = false;

async function getClient(): Promise<RedisLike | null> {
  const url = loadEnv().REDIS_URL;
  if (!url || clientFailed) return client;
  if (client) return client;
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
    }) as unknown as RedisLike;
    redis.on('error', (err: unknown) => {
      console.error(
        '[security][rate-limit] erreur Redis — store général en fail-open ; auth en fail-closed.',
        err,
      );
    });
    client = redis;
    return client;
  } catch (err) {
    clientFailed = true;
    console.error('[rate-limit] Redis indisponible au démarrage — compteurs locaux (mémoire)', err);
    return null;
  }
}

const INCR_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

class RedisRateLimitStore implements Store {
  constructor(private readonly redis: RedisLike) {}

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const result = (await this.redis.eval(INCR_SCRIPT, 1, key, this.windowMs)) as [number, number];
    const [totalHits, ttlMs] = result;
    return {
      totalHits,
      resetTime: ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined,
    };
  }

  windowMs = 60_000;
  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  async decrement(key: string): Promise<void> {
    await this.redis.eval(`return redis.call('DECR', KEYS[1])`, 1, key).catch(() => undefined);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(key).catch(() => undefined);
  }
}

class FailOpenStore implements Store {
  constructor(private readonly inner: RedisRateLimitStore) {}
  windowMs = 60_000;
  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
    this.inner.init(options);
  }
  async increment(key: string): Promise<ClientRateLimitInfo> {
    try {
      return await this.inner.increment(key);
    } catch (err) {
      console.error('[security][rate-limit] incrément Redis échoué — fail-open', err);
      return { totalHits: 1, resetTime: undefined };
    }
  }
  async decrement(key: string): Promise<void> {
    await this.inner.decrement(key).catch(() => undefined);
  }
  async resetKey(key: string): Promise<void> {
    await this.inner.resetKey(key).catch(() => undefined);
  }
}

/**
 * Auth : si Redis est configuré mais l'incrément échoue, on traite comme quota
 * atteint (totalHits énorme) plutôt que de laisser passer le bruteforce.
 */
export class FailClosedRateLimitStore implements Store {
  constructor(private readonly inner: RedisRateLimitStore) {}
  windowMs = 60_000;
  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
    this.inner.init(options);
  }
  async increment(key: string): Promise<ClientRateLimitInfo> {
    try {
      return await this.inner.increment(key);
    } catch (err) {
      console.error('[security][rate-limit] incrément Redis échoué — fail-closed (auth)', err);
      return {
        totalHits: Number.MAX_SAFE_INTEGER,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    }
  }
  async decrement(key: string): Promise<void> {
    await this.inner.decrement(key).catch(() => undefined);
  }
  async resetKey(key: string): Promise<void> {
    await this.inner.resetKey(key).catch(() => undefined);
  }
}

/** Exposé pour tests unitaires du comportement fail-closed. */
export function createFailClosedStoreForTest(inner: {
  increment: (key: string) => Promise<ClientRateLimitInfo>;
  windowMs?: number;
  init?: (o: { windowMs: number }) => void;
  decrement?: (key: string) => Promise<void>;
  resetKey?: (key: string) => Promise<void>;
}): Store {
  return new FailClosedRateLimitStore(inner as unknown as RedisRateLimitStore);
}

let sharedStore: Store | null | undefined;
let authStore: Store | null | undefined;

async function resolveStore(): Promise<Store | null> {
  if (sharedStore !== undefined) return sharedStore;
  const redis = await getClient();
  if (redis) {
    const base = new RedisRateLimitStore(redis);
    sharedStore = new FailOpenStore(base);
    authStore = new FailClosedRateLimitStore(base);
  } else {
    sharedStore = null;
    authStore = null;
  }
  return sharedStore;
}

export async function initRateLimitStore(): Promise<void> {
  await resolveStore();
}

/**
 * Store général (fail-open). undefined = MemoryStore local.
 */
export function sharedStoreOrUndefined(): Store | undefined {
  return sharedStore ?? undefined;
}

/**
 * Store pour login / MFA / reset : fail-closed si Redis configuré.
 * Sans Redis, retombe sur le store général (MemoryStore local en dev).
 */
export function authRateLimitStoreOrUndefined(): Store | undefined {
  return authStore ?? sharedStore ?? undefined;
}

/**
 * Clé de rate-limit auth : IP + email normalisé (casse / espaces).
 * Sans email (body non parsé), tombe sur l'IP seule.
 */
export function authRateLimitKey(prefix: string, ip: string | undefined, email: unknown): string {
  const safeIp = ip && ip.length > 0 ? ip : 'unknown';
  const normalized =
    typeof email === 'string' ? email.toLowerCase().trim() : '';
  return normalized ? `${prefix}:${safeIp}:${normalized}` : `${prefix}:${safeIp}`;
}
