import type { Event } from '../domain';
import { loadEnv } from '../config/env';
import { findEventByCustomDomain, findEventBySubdomain } from '../db/repositories/eventRepo';

/** Cible CNAME à communiquer aux clients (host Railway ou fallback configuré). */
export function customDomainTarget(): string {
  const env = loadEnv();
  return env.CUSTOM_DOMAIN_TARGET ?? new URL(env.PUBLIC_BASE_URL).host;
}

/** Domaine de base de la plateforme pour les sous-domaines self-service (ex. `prevent360.app`). */
export function platformBaseDomain(): string | null {
  const env = loadEnv();
  return env.PLATFORM_BASE_DOMAIN ? normalizeDomain(env.PLATFORM_BASE_DOMAIN) : null;
}

/**
 * Résolution « domaine personnalisé → événement » pour le routage par Host.
 * Mise en cache mémoire courte (TTL) car appelée sur chaque rendu de la SPA ;
 * les `null` sont aussi mis en cache (le domaine principal ne matche aucun event).
 */
const TTL_MS = 60_000;
/**
 * Le cache est indexé par en-tête `Host`, donc par une valeur entièrement
 * choisie par l'appelant : sans borne, une série de requêtes portant chacune un
 * hôte différent le fait croître indéfiniment jusqu'à épuiser la mémoire du
 * conteneur (CWE-770, déni de service non authentifié — la SPA appelle cette
 * résolution à chaque rendu). Le plafond couvre très largement le nombre réel
 * de domaines clients ; au-delà, on purge plutôt que de grossir.
 */
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { event: Event | null; expires: number }>();

/** Mémorise une résolution en gardant le cache borné. */
function remember(host: string, event: Event | null, now: number): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    for (const [key, value] of cache) {
      if (value.expires <= now) cache.delete(key);
    }
    // Toujours plein : ce sont des hôtes récents et inconnus (flot d'attaque).
    // On repart de zéro — les vrais domaines seront re-résolus en une requête.
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  }
  cache.set(host, { event, expires: now + TTL_MS });
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, ''); // retire le port éventuel (ex. en dev)
}

/**
 * Empêche qu'un événement revendique un host exploité par la plateforme elle-même.
 * Le domaine de base est réservé avec tous ses sous-domaines : ceux-ci sont gérés
 * exclusivement par le mécanisme de `subdomain_slug`.
 */
export function isReservedCustomDomain(input: string): boolean {
  const domain = normalizeDomain(input);
  if (!domain) return true;
  const env = loadEnv();
  const exact = new Set(
    [env.PUBLIC_BASE_URL, env.CLIENT_URL, customDomainTarget()]
      .map((value) => normalizeDomain(value))
      .filter(Boolean),
  );
  if (exact.has(domain) || domain === 'localhost' || domain === '127.0.0.1' || domain === '::1') {
    return true;
  }
  const base = platformBaseDomain();
  return Boolean(base && (domain === base || domain.endsWith(`.${base}`)));
}

export async function resolveEventForHost(hostname: string): Promise<Event | null> {
  const host = normalizeDomain(hostname);
  if (!host) return null;
  const now = Date.now();
  const hit = cache.get(host);
  if (hit && hit.expires > now) return hit.event;

  let event: Event | null = null;
  // 1) Sous-domaine plateforme : <slug>.<PLATFORM_BASE_DOMAIN>
  const base = platformBaseDomain();
  if (base && host.endsWith(`.${base}`)) {
    const slug = host.slice(0, -(base.length + 1));
    if (slug && !slug.includes('.')) event = await findEventBySubdomain(slug);
  }
  // 2) Sinon, domaine personnalisé du client.
  if (!event && !isReservedCustomDomain(host)) {
    const candidate = await findEventByCustomDomain(host);
    // La possession DNS doit être prouvée avant que le Host puisse sélectionner
    // l'événement. Une simple valeur saisie dans le back-office ne suffit jamais.
    if (candidate?.customDomainVerified) event = candidate;
  }

  remember(host, event, now);
  return event;
}

/** Invalide le cache pour un domaine (après affectation/retrait côté back-office). */
export function invalidateDomain(domain: string | null | undefined): void {
  if (domain) cache.delete(normalizeDomain(domain));
}
