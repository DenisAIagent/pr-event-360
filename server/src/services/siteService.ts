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
const cache = new Map<string, { event: Event | null; expires: number }>();

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, ''); // retire le port éventuel (ex. en dev)
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
  if (!event) event = await findEventByCustomDomain(host);

  cache.set(host, { event, expires: now + TTL_MS });
  return event;
}

/** Invalide le cache pour un domaine (après affectation/retrait côté back-office). */
export function invalidateDomain(domain: string | null | undefined): void {
  if (domain) cache.delete(normalizeDomain(domain));
}
