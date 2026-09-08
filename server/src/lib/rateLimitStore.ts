import type { Store, ClientRateLimitInfo, Options } from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
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


/**
 * Store Redis d'UN limiteur. Chaque limiteur porte son propre préfixe de clé :
 * express-rate-limit v7 interdit de PARTAGER une même instance de Store entre
 * plusieurs limiteurs (ERR_ERL_STORE_REUSE), et sans préfixe deux limiteurs
 * comptant par IP (public / journaliste) partageraient le même compteur.
 */
class RedisRateLimitStore implements Store {
  constructor(
    private readonly redis: RedisLike,
    private readonly keyPrefix: string,
  ) {}

  windowMs = 60_000;
  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const result = (await this.redis.eval(
      INCR_SCRIPT,
      1,
      this.keyPrefix + key,
      this.windowMs,
    )) as [number, number];
    const [totalHits, ttlMs] = result;
    return {
      totalHits,
      resetTime: ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined,
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis
      .eval(`return redis.call('DECR', KEYS[1])`, 1, this.keyPrefix + key)
      .catch(() => undefined);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.keyPrefix + key).catch(() => undefined);
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

/** Client Redis résolu une fois au démarrage. `null` si REDIS_URL absent/échec. */
function getResolvedClient(): RedisLike | null {
  return client;
}

/** Point d'injection pour les tests du chemin Redis (préfixe, fail-open/closed). */
export function __setRedisClientForTest(fake: RedisLike | null): void {
  client = fake;
  clientFailed = false;
}

type LimiterScope = 'general' | 'auth';

/**
 * Store d'un limiteur, résolu PARESSEUSEMENT à la première requête — donc après
 * `initRateLimitStore`, même quand le limiteur est construit au chargement du
 * module (cas des limiteurs auth). Avec Redis : compteur partagé entre instances,
 * préfixé par limiteur (fail-open général, fail-closed auth). Sans Redis : un
 * MemoryStore propre au limiteur (jamais partagé → pas d'ERR_ERL_STORE_REUSE).
 */
class LazyRateLimitStore implements Store {
  private delegate: Store | undefined;
  // Options transmises par express-rate-limit à la création du limiteur ; on les
  // rejoue telles quelles sur le délégué résolu paresseusement.
  private options: Options | undefined;

  constructor(
    private readonly scope: LimiterScope,
    private readonly name: string,
  ) {}

  init(options: Options): void {
    this.options = options;
    this.delegate?.init?.(options);
  }

  private resolve(): Store {
    if (this.delegate) return this.delegate;
    const redis = getResolvedClient();
    if (redis) {
      const base = new RedisRateLimitStore(redis, `rl:${this.name}:`);
      this.delegate =
        this.scope === 'auth' ? new FailClosedRateLimitStore(base) : new FailOpenStore(base);
    } else {
      this.delegate = new MemoryStore();
    }
    if (this.options) this.delegate.init?.(this.options);
    return this.delegate;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    return this.resolve().increment(key);
  }
  async decrement(key: string): Promise<void> {
    await this.resolve().decrement?.(key);
  }
  async resetKey(key: string): Promise<void> {
    await this.resolve().resetKey?.(key);
  }
}

/**
 * Crée le store d'UN limiteur. À appeler une seule fois par limiteur, avec un
 * `name` unique (préfixe de clés Redis + isolation d'instance).
 */
export function createLimiterStore(opts: { scope: LimiterScope; name: string }): Store {
  return new LazyRateLimitStore(opts.scope, opts.name);
}

/**
 * Résout le client Redis au démarrage (connexion + trace d'état), pour que la
 * première requête n'attende pas et que la présence/absence de Redis soit loguée.
 */
export async function initRateLimitStore(): Promise<void> {
  await getClient();
}


/**
 * Clé de rate-limit indexée sur le COMPTE ciblé, indépendamment de l'IP source.
 *
 * Une limite par IP seule ne protège pas un secret court : un pool d'adresses
 * (proxies résidentiels) multiplie le quota par le nombre d'IP et rouvre le
 * bruteforce. C'est décisif pour l'étape TOTP, dont le secret n'a que
 * 10^6 valeurs et dont le challenge est un JWT sans état, rejouable pendant
 * toute sa durée de vie. Cf. OWASP ASVS 4.0.3 V2.2.1 (anti-automation sur le
 * second facteur).
 *
 * `accountId` doit provenir d'une valeur VÉRIFIÉE côté serveur (signature du
 * challenge), sinon l'attaquant choisirait librement sa propre clé de comptage.
 * Sans compte identifiable, on retombe sur l'IP pour rester borné.
 */
export function accountRateLimitKey(
  prefix: string,
  accountId: string | null | undefined,
  ip: string | undefined,
): string {
  if (accountId) return `${prefix}:acct:${accountId}`;
  return `${prefix}:ip:${ip && ip.length > 0 ? ip : 'unknown'}`;
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

