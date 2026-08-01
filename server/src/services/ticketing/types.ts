import type { TicketingProviderId } from '../../db/repositories/ticketingRepo';

/** Credentials stockés chiffrés (forme libre par provider). */
export type ProviderCredentials = Record<string, string>;

export interface ExternalEvent {
  id: string;
  name: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface ExternalTicket {
  id: string;
  name: string;
  price?: number | null;
  /** Tarif adapté aux invités presse (gratuit / invitation). */
  isGuestFriendly?: boolean;
}

export interface ProvisionGuestInput {
  externalEventId: string;
  externalTicketId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  media?: string | null;
  /** Id journaliste PR360 — traçabilité. */
  journalistId: string;
}

export interface ProvisionGuestResult {
  externalParticipantId: string;
  barcode: string;
  raw?: unknown;
}

export interface ExternalAttendeeScan {
  externalParticipantId: string;
  barcode?: string | null;
  email?: string | null;
  scanned: boolean;
  scannedAt?: string | null;
}

export interface ProviderCapabilities {
  listEvents: boolean;
  listTickets: boolean;
  createGuest: boolean;
  readCheckIns: boolean;
  /** true = webhooks possibles (sinon polling). */
  webhooks: boolean;
}

export interface TicketingProvider {
  id: TicketingProviderId;
  label: string;
  description: string;
  /** Champs de credentials à demander dans l'UI. */
  credentialFields: Array<{
    key: string;
    label: string;
    secret?: boolean;
    hint?: string;
    placeholder?: string;
  }>;
  docsUrl: string;
  capabilities: ProviderCapabilities;
  /** Vérifie les credentials (auth + list events si possible). */
  testConnection(credentials: ProviderCredentials): Promise<{ ok: boolean; message: string }>;
  listEvents(credentials: ProviderCredentials): Promise<ExternalEvent[]>;
  listTickets(credentials: ProviderCredentials, externalEventId: string): Promise<ExternalTicket[]>;
  createGuest(
    credentials: ProviderCredentials,
    input: ProvisionGuestInput,
  ): Promise<ProvisionGuestResult>;
  listRecentScans(
    credentials: ProviderCredentials,
    externalEventId: string,
    since?: Date,
  ): Promise<ExternalAttendeeScan[]>;
  revokeGuest?(
    credentials: ProviderCredentials,
    externalParticipantId: string,
  ): Promise<void>;
}
