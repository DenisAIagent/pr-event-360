import type { Store, ClientRateLimitInfo } from 'express-rate-limit';
import { loadEnv } from '../config/env';

/**
 * Store Redis pour express-rate-limit : compteurs de débit PARTAGÉS entre
 * instances (sinon chaque replica compte localement et la limite effective est
 * multipliée par N — y compris l'anti-bruteforce du login).
 *
 * Actif seulement si REDIS_URL est défini ; sinon les limiteurs gardent le
 * MemoryStore par défaut. En cas d'indisponibilité de Redis, le store
 * FAIL OPEN (laisse passer) plutôt que de renvoyer des 500 sur toutes les
 * routes limitées : la disponibilité prime, l'événement est journalisé.
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
    // Import dynamique : ioredis n'est chargé que lorsque REDIS_URL est défini.
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
    }) as unknown as RedisLike;
    redis.on('error', (err: unknown) => {
      console.error(
        '[security][rate-limit] erreur Redis — les limiteurs passent en mode dégradé (fail-open). Anti-bruteforce affaibli.',
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

/**
 * Incrémente atomiquement le compteur d'une clé et pose son expiration à la
 * première requête de la fenêtre (INCR + PEXPIRE en une seule Lua eval).
 */
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

  // Fenêtre fixe configurée par express-rate-limit au init().
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
      // Redis en panne : on laisse passer (fail-open) — voir l'en-tête du fichier.
      // Journalisé à chaque échec pour alerter l'ops (bruteforce temporairement affaibli).
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

let sharedStore: Store | null | undefined;

/**
 * Renvoie le store partagé Redis, ou null (→ MemoryStore d'express-rate-limit)
 * quand REDIS_URL est absent ou Redis indisponible au démarrage.
 */
async function resolveStore(): Promise<Store | null> {
  if (sharedStore !== undefined) return sharedStore;
  const redis = await getClient();
  sharedStore = redis ? new FailOpenStore(new RedisRateLimitStore(redis)) : null;
  return sharedStore;
}

/**
 * À appeler AU DÉMARRAGE (index.ts, avant createApp) : établit la connexion
 * Redis une fois pour toutes. Les limiteurs utilisent ensuite
 * `sharedStoreOrUndefined()` de façon synchrone.
 */
export async function initRateLimitStore(): Promise<void> {
  await resolveStore();
}

/**
 * Store à passer aux limiteurs (option `store`). undefined = MemoryStore par
 * défaut d'express-rate-limit. Sans `initRateLimitStore()` préalable (tests),
 * renvoie undefined — comportement local inchangé.
 */
export function sharedStoreOrUndefined(): Store | undefined {
  return sharedStore ?? undefined;
}
