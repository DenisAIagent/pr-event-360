import type { TicketingProviderId } from '../../db/repositories/ticketingRepo';
import type { TicketingProvider } from './types';
import { billetwebProvider } from './providers/billetweb';
import { eventbriteProvider } from './providers/eventbrite';
import { shotgunProvider } from './providers/shotgun';
import { weezeventProvider } from './providers/weezevent';

const PROVIDERS: TicketingProvider[] = [
  weezeventProvider,
  billetwebProvider,
  eventbriteProvider,
  shotgunProvider,
];

export function listTicketingProviders(): TicketingProvider[] {
  return PROVIDERS;
}

export function getTicketingProvider(id: TicketingProviderId): TicketingProvider {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Provider billetterie inconnu : ${id}`);
  return p;
}
