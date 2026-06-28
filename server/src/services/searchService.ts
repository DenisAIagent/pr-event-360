import type { AuthClaims } from '../lib/jwt';
import { listEventsForUserService } from './eventService';
import { searchJournalists, type JournalistSearchHit } from '../db/repositories/journalistRepo';

export interface SearchResults {
  journalists: JournalistSearchHit[];
  events: { id: string; name: string }[];
}

/**
 * Recherche globale du back-office : journalistes (nom/email/média) + événements
 * (nom), strictement limités aux événements accessibles à l'utilisateur.
 */
export async function globalSearch(actor: AuthClaims, query: string): Promise<SearchResults> {
  const events = await listEventsForUserService(actor);
  const ids = events.map((e) => e.id);
  const ql = query.toLowerCase();
  const eventHits = events
    .filter((e) => e.name.toLowerCase().includes(ql))
    .slice(0, 5)
    .map((e) => ({ id: e.id, name: e.name }));
  const journalists = await searchJournalists(ids, query, 8);
  return { journalists, events: eventHits };
}
