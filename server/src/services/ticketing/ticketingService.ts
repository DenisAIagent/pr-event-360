import { AppError } from '../../http/AppError';
import { encryptSecret, decryptSecret, isEncryptionAvailable } from '../../lib/crypto';
import {
  countTicketingLinks,
  deleteJournalistTicketingLink,
  deleteTicketingConnection,
  findJournalistTicketingLink,
  findTicketingConnection,
  listConnectedTicketingEvents,
  listJournalistTicketingLinks,
  type TicketingMode,
  type TicketingProviderId,
  upsertJournalistTicketingLink,
  upsertTicketingConnection,
  updateTicketingConnectionStatus,
} from '../../db/repositories/ticketingRepo';
import { findJournalistById, listJournalistsByEvent, setJournalistCheckedIn } from '../../db/repositories/journalistRepo';
import { getEventOrThrow } from '../eventService';
import { getTicketingProvider, listTicketingProviders } from './registry';
import type { ProviderCredentials } from './types';
import { sandboxMarkScanned } from './providers/sandboxHelpers';

function withMode(credentials: ProviderCredentials, mode: TicketingMode): ProviderCredentials {
  return mode === 'sandbox' ? { ...credentials, __mode: 'sandbox' } : credentials;
}

function encryptCredentials(credentials: ProviderCredentials): string {
  if (!isEncryptionAvailable()) {
    throw AppError.badRequest(
      'Chiffrement non configuré : définissez APP_ENCRYPTION_KEY pour stocker les clés billetterie.',
    );
  }
  return encryptSecret(JSON.stringify(credentials));
}

function decryptCredentials(blob: string): ProviderCredentials {
  try {
    return JSON.parse(decryptSecret(blob)) as ProviderCredentials;
  } catch {
    throw AppError.badRequest('Impossible de lire les identifiants billetterie (clé de chiffrement ?).');
  }
}

/** Catalogue providers pour l'UI (sans secrets). */
export function getTicketingCatalog() {
  return listTicketingProviders().map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    docsUrl: p.docsUrl,
    capabilities: p.capabilities,
    credentialFields: p.credentialFields,
  }));
}

/** État de la connexion billetterie d'un événement (safe pour l'UI). */
export async function getTicketingStatus(eventId: string) {
  await getEventOrThrow(eventId);
  const conn = await findTicketingConnection(eventId);
  const counts = await countTicketingLinks(eventId);
  const links = await listJournalistTicketingLinks(eventId);
  if (!conn) {
    return {
      connected: false as const,
      encryptionReady: isEncryptionAvailable(),
      providers: getTicketingCatalog(),
      stats: counts,
      links: [] as Array<{
        journalistId: string;
        barcode: string | null;
        externalStatus: string | null;
        lastScannedAt: string | null;
        provisionedAt: string;
      }>,
    };
  }
  return {
    connected: true as const,
    encryptionReady: isEncryptionAvailable(),
    providers: getTicketingCatalog(),
    connection: {
      provider: conn.provider,
      mode: conn.mode,
      status: conn.status,
      lastError: conn.last_error,
      lastSyncAt: conn.last_sync_at,
      lastTestAt: conn.last_test_at,
      externalEventId: conn.external_event_id,
      externalEventName: conn.external_event_name,
      externalTicketId: conn.external_ticket_id,
      externalTicketName: conn.external_ticket_name,
      autoProvision: conn.auto_provision,
      autoSyncCheckin: conn.auto_sync_checkin,
      // Indique si des credentials sont stockés (jamais la valeur).
      hasCredentials: !!conn.credentials_encrypted,
    },
    stats: counts,
    links: links.map((l) => ({
      journalistId: l.journalist_id,
      barcode: l.barcode,
      externalStatus: l.external_status,
      lastScannedAt: l.last_scanned_at,
      provisionedAt: l.provisioned_at,
    })),
  };
}

export async function saveTicketingConnection(
  eventId: string,
  input: {
    provider: TicketingProviderId;
    mode: TicketingMode;
    credentials?: ProviderCredentials;
    externalEventId?: string | null;
    externalEventName?: string | null;
    externalTicketId?: string | null;
    externalTicketName?: string | null;
    autoProvision?: boolean;
    autoSyncCheckin?: boolean;
  },
) {
  await getEventOrThrow(eventId);
  const existing = await findTicketingConnection(eventId);
  let credBlob = existing?.credentials_encrypted;
  if (input.credentials && Object.keys(input.credentials).length > 0) {
    // Merge avec les credentials existants pour ne pas écraser un secret laissé vide.
    const prev = existing ? decryptCredentials(existing.credentials_encrypted) : {};
    const merged = { ...prev };
    for (const [k, v] of Object.entries(input.credentials)) {
      if (v !== '') merged[k] = v;
    }
    credBlob = encryptCredentials(merged);
  }
  if (!credBlob && input.mode === 'live') {
    throw AppError.badRequest('Identifiants requis en mode live.');
  }
  if (!credBlob) {
    // Sandbox sans credentials : blob minimal chiffré.
    credBlob = encryptCredentials({ sandbox: '1' });
  }

  const row = await upsertTicketingConnection({
    eventId,
    provider: input.provider,
    credentialsEncrypted: credBlob,
    externalEventId: input.externalEventId,
    externalEventName: input.externalEventName,
    externalTicketId: input.externalTicketId,
    externalTicketName: input.externalTicketName,
    autoProvision: input.autoProvision,
    autoSyncCheckin: input.autoSyncCheckin,
    mode: input.mode,
    status: 'disconnected',
    lastError: null,
  });
  return row;
}

export async function testTicketingConnection(eventId: string) {
  const conn = await findTicketingConnection(eventId);
  if (!conn) throw AppError.notFound('Aucune connexion billetterie');
  const provider = getTicketingProvider(conn.provider);
  const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
  try {
    const result = await provider.testConnection(credentials);
    await updateTicketingConnectionStatus(eventId, {
      status: result.ok ? 'connected' : 'error',
      lastError: result.ok ? null : result.message,
      lastTestAt: new Date(),
    });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Test échoué';
    await updateTicketingConnectionStatus(eventId, {
      status: 'error',
      lastError: message,
      lastTestAt: new Date(),
    });
    throw AppError.badRequest(message);
  }
}

export async function listRemoteEvents(eventId: string) {
  const conn = await findTicketingConnection(eventId);
  if (!conn) throw AppError.notFound('Aucune connexion billetterie');
  const provider = getTicketingProvider(conn.provider);
  const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
  return provider.listEvents(credentials);
}

export async function listRemoteTickets(eventId: string, externalEventId?: string) {
  const conn = await findTicketingConnection(eventId);
  if (!conn) throw AppError.notFound('Aucune connexion billetterie');
  const extId = externalEventId ?? conn.external_event_id;
  if (!extId) throw AppError.badRequest('Sélectionnez d’abord un événement billetterie.');
  const provider = getTicketingProvider(conn.provider);
  const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
  return provider.listTickets(credentials, extId);
}

export async function disconnectTicketing(eventId: string) {
  await deleteTicketingConnection(eventId);
}

/**
 * Crée (ou réserve) un invité billetterie pour un journaliste accepté.
 * Ne bloque jamais l'acceptation d'accréditation : erreurs loguées.
 */
export async function provisionJournalistGuest(
  eventId: string,
  journalistId: string,
): Promise<{ ok: boolean; barcode?: string; error?: string }> {
  const conn = await findTicketingConnection(eventId);
  if (!conn || !conn.auto_provision || conn.status === 'disconnected') {
    return { ok: false, error: 'Billetterie non active' };
  }
  if (!conn.external_event_id || !conn.external_ticket_id) {
    return { ok: false, error: 'Événement / tarif billetterie non configurés' };
  }
  const journalist = await findJournalistById(journalistId);
  if (!journalist || journalist.eventId !== eventId || journalist.accStatus !== 'acceptee') {
    return { ok: false, error: 'Journaliste non éligible' };
  }
  const existing = await findJournalistTicketingLink(journalistId);
  if (existing?.barcode && !existing.external_participant_id?.startsWith('pending-')) {
    return { ok: true, barcode: existing.barcode };
  }

  const provider = getTicketingProvider(conn.provider);
  const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
  try {
    const guest = await provider.createGuest(credentials, {
      externalEventId: conn.external_event_id,
      externalTicketId: conn.external_ticket_id,
      firstName: journalist.firstName,
      lastName: journalist.lastName,
      email: journalist.email,
      media: journalist.media,
      journalistId: journalist.id,
    });
    await upsertJournalistTicketingLink({
      journalistId: journalist.id,
      eventId,
      provider: conn.provider,
      externalParticipantId: guest.externalParticipantId,
      barcode: guest.barcode,
      externalStatus: 'provisioned',
      meta: guest.raw && typeof guest.raw === 'object' ? (guest.raw as Record<string, unknown>) : {},
    });
    return { ok: true, barcode: guest.barcode };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Provision échouée';
    console.error(`[ticketing] provision ${journalistId}:`, message);
    return { ok: false, error: message };
  }
}

/** Révoque le lien billetterie (refus d'accréditation). */
export async function revokeJournalistGuest(eventId: string, journalistId: string): Promise<void> {
  const conn = await findTicketingConnection(eventId);
  const link = await findJournalistTicketingLink(journalistId);
  if (!conn || !link) return;
  const provider = getTicketingProvider(conn.provider);
  if (provider.revokeGuest && link.external_participant_id && conn.mode === 'live') {
    try {
      const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
      await provider.revokeGuest(credentials, link.external_participant_id);
    } catch (e) {
      console.error('[ticketing] revoke', e);
    }
  }
  await deleteJournalistTicketingLink(journalistId);
}

/**
 * Synchronise les scans billetterie → checked_in_at PR360.
 * Matching par external_participant_id, barcode, ou email.
 */
export async function syncTicketingCheckIns(eventId: string): Promise<{
  scanned: number;
  updated: number;
}> {
  const conn = await findTicketingConnection(eventId);
  if (!conn || !conn.auto_sync_checkin || !conn.external_event_id) {
    return { scanned: 0, updated: 0 };
  }
  const provider = getTicketingProvider(conn.provider);
  const credentials = withMode(decryptCredentials(conn.credentials_encrypted), conn.mode);
  const since = conn.last_sync_at ? new Date(conn.last_sync_at) : undefined;
  let scans;
  try {
    scans = await provider.listRecentScans(credentials, conn.external_event_id, since);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync échouée';
    await updateTicketingConnectionStatus(eventId, { status: 'error', lastError: message });
    throw AppError.badRequest(message);
  }

  const links = await listJournalistTicketingLinks(eventId);
  const journalists = await listJournalistsByEvent(eventId);
  const byExt = new Map(links.map((l) => [l.external_participant_id ?? '', l]));
  const byBarcode = new Map(links.filter((l) => l.barcode).map((l) => [l.barcode!, l]));
  const byEmail = new Map(journalists.map((j) => [j.email.toLowerCase(), j]));

  let scanned = 0;
  let updated = 0;
  for (const s of scans) {
    if (!s.scanned) continue;
    scanned += 1;
    let link =
      (s.externalParticipantId && byExt.get(s.externalParticipantId)) ||
      (s.barcode && byBarcode.get(s.barcode)) ||
      null;
    if (!link && s.email) {
      const j = byEmail.get(s.email.toLowerCase());
      if (j) link = links.find((l) => l.journalist_id === j.id) ?? null;
      if (!link && j && j.accStatus === 'acceptee') {
        // Rapprochement email sans lien préalable
        await upsertJournalistTicketingLink({
          journalistId: j.id,
          eventId,
          provider: conn.provider,
          externalParticipantId: s.externalParticipantId || null,
          barcode: s.barcode ?? null,
          externalStatus: 'scanned',
          lastScannedAt: s.scannedAt ? new Date(s.scannedAt) : new Date(),
        });
        const j2 = await findJournalistById(j.id);
        if (j2 && !j2.checkedInAt) {
          await setJournalistCheckedIn(eventId, j.id);
          updated += 1;
        }
        continue;
      }
    }
    if (!link) continue;
    await upsertJournalistTicketingLink({
      journalistId: link.journalist_id,
      eventId,
      provider: conn.provider,
      externalParticipantId: s.externalParticipantId || link.external_participant_id,
      barcode: s.barcode ?? link.barcode,
      externalStatus: 'scanned',
      lastScannedAt: s.scannedAt ? new Date(s.scannedAt) : new Date(),
    });
    const j = await findJournalistById(link.journalist_id);
    if (j && !j.checkedInAt && j.accStatus === 'acceptee') {
      await setJournalistCheckedIn(eventId, link.journalist_id);
      updated += 1;
    }
  }

  await updateTicketingConnectionStatus(eventId, {
    status: 'connected',
    lastError: null,
    lastSyncAt: new Date(),
  });
  return { scanned, updated };
}

/** Sync toutes les connexions actives (scheduler). */
export async function syncAllTicketingCheckIns(): Promise<void> {
  const conns = await listConnectedTicketingEvents();
  for (const c of conns) {
    try {
      const r = await syncTicketingCheckIns(c.event_id);
      if (r.updated > 0) {
        console.log(`[ticketing] event ${c.event_id}: ${r.updated} check-in(s) synchronisé(s)`);
      }
    } catch (e) {
      console.error(`[ticketing] sync ${c.event_id}`, e);
    }
  }
}

/** Simule un scan bac à sable pour un journaliste (démo). */
export async function simulateSandboxScan(eventId: string, journalistId: string) {
  const conn = await findTicketingConnection(eventId);
  if (!conn || conn.mode !== 'sandbox') {
    throw AppError.badRequest('Simulation réservée au mode bac à sable.');
  }
  let link = await findJournalistTicketingLink(journalistId);
  if (!link) {
    const prov = await provisionJournalistGuest(eventId, journalistId);
    if (!prov.ok) throw AppError.badRequest(prov.error ?? 'Provision impossible');
    link = await findJournalistTicketingLink(journalistId);
  }
  if (!link?.external_participant_id) throw AppError.badRequest('Lien billetterie introuvable');
  sandboxMarkScanned(link.external_participant_id);
  await syncTicketingCheckIns(eventId);
  return { ok: true };
}

/** Provisionne tous les accrédités acceptés pas encore liés. */
export async function provisionMissingGuests(eventId: string) {
  const journalists = await listJournalistsByEvent(eventId);
  const accepted = journalists.filter((j) => j.accStatus === 'acceptee');
  let ok = 0;
  let failed = 0;
  for (const j of accepted) {
    const existing = await findJournalistTicketingLink(j.id);
    if (existing?.barcode) continue;
    const r = await provisionJournalistGuest(eventId, j.id);
    if (r.ok) ok += 1;
    else failed += 1;
  }
  return { provisioned: ok, failed };
}
