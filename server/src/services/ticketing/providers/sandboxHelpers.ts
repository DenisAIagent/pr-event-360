import { createHash, randomBytes } from 'node:crypto';
import type {
  ExternalAttendeeScan,
  ExternalEvent,
  ExternalTicket,
  ProvisionGuestInput,
  ProvisionGuestResult,
  ProviderCredentials,
} from '../types';

/** Mémoire process pour la démo sandbox (scans simulés). */
const sandboxScans = new Map<string, { scannedAt: string }>();

export function sandboxBarcode(journalistId: string): string {
  return `SBX-${createHash('sha256').update(journalistId).digest('hex').slice(0, 12).toUpperCase()}`;
}

export async function sandboxTest(): Promise<{ ok: boolean; message: string }> {
  return { ok: true, message: 'Mode bac à sable : aucun appel externe. Idéal pour tester le parcours.' };
}

export async function sandboxEvents(): Promise<ExternalEvent[]> {
  return [
    {
      id: 'sandbox-event-1',
      name: 'Événement démo (bac à sable)',
      startsAt: new Date().toISOString(),
    },
  ];
}

export async function sandboxTickets(): Promise<ExternalTicket[]> {
  return [
    { id: 'sandbox-ticket-presse', name: 'Invitation Presse (gratuit)', price: 0, isGuestFriendly: true },
    { id: 'sandbox-ticket-staff', name: 'Staff', price: 0, isGuestFriendly: true },
  ];
}

export async function sandboxCreateGuest(input: ProvisionGuestInput): Promise<ProvisionGuestResult> {
  const barcode = sandboxBarcode(input.journalistId);
  return {
    externalParticipantId: `sbx-${input.journalistId.slice(0, 8)}-${randomBytes(3).toString('hex')}`,
    barcode,
  };
}

export async function sandboxListScans(): Promise<ExternalAttendeeScan[]> {
  return [...sandboxScans.entries()].map(([id, v]) => ({
    externalParticipantId: id,
    scanned: true,
    scannedAt: v.scannedAt,
  }));
}

/** Simule un scan pour un participant sandbox (outil admin). */
export function sandboxMarkScanned(externalParticipantId: string): void {
  sandboxScans.set(externalParticipantId, { scannedAt: new Date().toISOString() });
}

export function requireCreds(credentials: ProviderCredentials, keys: string[]): void {
  for (const k of keys) {
    if (!credentials[k]?.trim()) throw new Error(`Champ requis manquant : ${k}`);
  }
}
