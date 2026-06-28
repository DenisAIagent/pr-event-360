import type { Event } from '../domain';
import { loadEnv } from '../config/env';
import { findEventByCustomDomain } from '../db/repositories/eventRepo';

/** Cible CNAME à communiquer aux clients (host Railway ou fallback configuré). */
export function customDomainTarget(): string {
  const env = loadEnv();
  return env.CUSTOM_DOMAIN_TARGET ?? new URL(env.PUBLIC_BASE_URL).host;
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

  const event = await findEventByCustomDomain(host);
  cache.set(host, { event, expires: now + TTL_MS });
  return event;
}

/** Invalide le cache pour un domaine (après affectation/retrait côté back-office). */
export function invalidateDomain(domain: string | null | undefined): void {
  if (domain) cache.delete(normalizeDomain(domain));
}
