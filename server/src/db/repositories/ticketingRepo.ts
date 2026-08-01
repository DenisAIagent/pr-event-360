import { pool } from '../pool';
import type { Queryable } from '../types';

export type TicketingProviderId = 'weezevent' | 'billetweb' | 'eventbrite' | 'shotgun';
export type TicketingMode = 'live' | 'sandbox';
export type TicketingStatus = 'disconnected' | 'connected' | 'error';

export interface TicketingConnectionRow {
  event_id: string;
  provider: TicketingProviderId;
  credentials_encrypted: string;
  external_event_id: string | null;
  external_event_name: string | null;
  external_ticket_id: string | null;
  external_ticket_name: string | null;
  auto_provision: boolean;
  auto_sync_checkin: boolean;
  mode: TicketingMode;
  status: TicketingStatus;
  last_error: string | null;
  last_sync_at: string | null;
  last_test_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalistTicketingLinkRow {
  journalist_id: string;
  event_id: string;
  provider: TicketingProviderId;
  external_participant_id: string | null;
  barcode: string | null;
  external_status: string | null;
  last_scanned_at: string | null;
  provisioned_at: string;
  last_sync_at: string | null;
  meta: Record<string, unknown>;
}

export async function findTicketingConnection(
  eventId: string,
  db: Queryable = pool,
): Promise<TicketingConnectionRow | null> {
  const { rows } = await db.query<TicketingConnectionRow>(
    'SELECT * FROM event_ticketing_connections WHERE event_id = $1',
    [eventId],
  );
  return rows[0] ?? null;
}

export async function listConnectedTicketingEvents(db: Queryable = pool): Promise<TicketingConnectionRow[]> {
  const { rows } = await db.query<TicketingConnectionRow>(
    `SELECT * FROM event_ticketing_connections
     WHERE status = 'connected' AND auto_sync_checkin = true`,
  );
  return rows;
}

export async function upsertTicketingConnection(
  input: {
    eventId: string;
    provider: TicketingProviderId;
    credentialsEncrypted: string;
    externalEventId?: string | null;
    externalEventName?: string | null;
    externalTicketId?: string | null;
    externalTicketName?: string | null;
    autoProvision?: boolean;
    autoSyncCheckin?: boolean;
    mode?: TicketingMode;
    status?: TicketingStatus;
    lastError?: string | null;
  },
  db: Queryable = pool,
): Promise<TicketingConnectionRow> {
  const { rows } = await db.query<TicketingConnectionRow>(
    `INSERT INTO event_ticketing_connections (
       event_id, provider, credentials_encrypted,
       external_event_id, external_event_name, external_ticket_id, external_ticket_name,
       auto_provision, auto_sync_checkin, mode, status, last_error, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,true),COALESCE($9,true),COALESCE($10,'sandbox'),COALESCE($11,'disconnected'),$12,now())
     ON CONFLICT (event_id) DO UPDATE SET
       provider = EXCLUDED.provider,
       credentials_encrypted = EXCLUDED.credentials_encrypted,
       external_event_id = EXCLUDED.external_event_id,
       external_event_name = EXCLUDED.external_event_name,
       external_ticket_id = EXCLUDED.external_ticket_id,
       external_ticket_name = EXCLUDED.external_ticket_name,
       auto_provision = COALESCE($8, event_ticketing_connections.auto_provision),
       auto_sync_checkin = COALESCE($9, event_ticketing_connections.auto_sync_checkin),
       mode = COALESCE($10, event_ticketing_connections.mode),
       status = COALESCE($11, event_ticketing_connections.status),
       last_error = $12,
       updated_at = now()
     RETURNING *`,
    [
      input.eventId,
      input.provider,
      input.credentialsEncrypted,
      input.externalEventId ?? null,
      input.externalEventName ?? null,
      input.externalTicketId ?? null,
      input.externalTicketName ?? null,
      input.autoProvision ?? null,
      input.autoSyncCheckin ?? null,
      input.mode ?? null,
      input.status ?? null,
      input.lastError ?? null,
    ],
  );
  return rows[0]!;
}

export async function updateTicketingConnectionStatus(
  eventId: string,
  patch: {
    status?: TicketingStatus;
    lastError?: string | null;
    lastSyncAt?: Date | null;
    lastTestAt?: Date | null;
    externalEventId?: string | null;
    externalEventName?: string | null;
    externalTicketId?: string | null;
    externalTicketName?: string | null;
    autoProvision?: boolean;
    autoSyncCheckin?: boolean;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE event_ticketing_connections SET
       status = COALESCE($2, status),
       last_error = CASE WHEN $3::boolean THEN $4 ELSE last_error END,
       last_sync_at = COALESCE($5, last_sync_at),
       last_test_at = COALESCE($6, last_test_at),
       external_event_id = COALESCE($7, external_event_id),
       external_event_name = COALESCE($8, external_event_name),
       external_ticket_id = COALESCE($9, external_ticket_id),
       external_ticket_name = COALESCE($10, external_ticket_name),
       auto_provision = COALESCE($11, auto_provision),
       auto_sync_checkin = COALESCE($12, auto_sync_checkin),
       updated_at = now()
     WHERE event_id = $1`,
    [
      eventId,
      patch.status ?? null,
      patch.lastError !== undefined,
      patch.lastError ?? null,
      patch.lastSyncAt ?? null,
      patch.lastTestAt ?? null,
      patch.externalEventId ?? null,
      patch.externalEventName ?? null,
      patch.externalTicketId ?? null,
      patch.externalTicketName ?? null,
      patch.autoProvision ?? null,
      patch.autoSyncCheckin ?? null,
    ],
  );
}

export async function deleteTicketingConnection(eventId: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM event_ticketing_connections WHERE event_id = $1', [eventId]);
}

export async function findJournalistTicketingLink(
  journalistId: string,
  db: Queryable = pool,
): Promise<JournalistTicketingLinkRow | null> {
  const { rows } = await db.query<JournalistTicketingLinkRow>(
    'SELECT * FROM journalist_ticketing_links WHERE journalist_id = $1',
    [journalistId],
  );
  return rows[0] ?? null;
}

export async function listJournalistTicketingLinks(
  eventId: string,
  db: Queryable = pool,
): Promise<JournalistTicketingLinkRow[]> {
  const { rows } = await db.query<JournalistTicketingLinkRow>(
    'SELECT * FROM journalist_ticketing_links WHERE event_id = $1 ORDER BY provisioned_at DESC',
    [eventId],
  );
  return rows;
}

export async function upsertJournalistTicketingLink(
  input: {
    journalistId: string;
    eventId: string;
    provider: TicketingProviderId;
    externalParticipantId?: string | null;
    barcode?: string | null;
    externalStatus?: string | null;
    lastScannedAt?: Date | null;
    meta?: Record<string, unknown>;
  },
  db: Queryable = pool,
): Promise<JournalistTicketingLinkRow> {
  const { rows } = await db.query<JournalistTicketingLinkRow>(
    `INSERT INTO journalist_ticketing_links (
       journalist_id, event_id, provider, external_participant_id, barcode,
       external_status, last_scanned_at, meta, last_sync_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::jsonb,'{}'::jsonb),now())
     ON CONFLICT (journalist_id) DO UPDATE SET
       provider = EXCLUDED.provider,
       external_participant_id = COALESCE(EXCLUDED.external_participant_id, journalist_ticketing_links.external_participant_id),
       barcode = COALESCE(EXCLUDED.barcode, journalist_ticketing_links.barcode),
       external_status = COALESCE(EXCLUDED.external_status, journalist_ticketing_links.external_status),
       last_scanned_at = COALESCE(EXCLUDED.last_scanned_at, journalist_ticketing_links.last_scanned_at),
       meta = journalist_ticketing_links.meta || EXCLUDED.meta,
       last_sync_at = now()
     RETURNING *`,
    [
      input.journalistId,
      input.eventId,
      input.provider,
      input.externalParticipantId ?? null,
      input.barcode ?? null,
      input.externalStatus ?? null,
      input.lastScannedAt ?? null,
      JSON.stringify(input.meta ?? {}),
    ],
  );
  return rows[0]!;
}

export async function deleteJournalistTicketingLink(
  journalistId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('DELETE FROM journalist_ticketing_links WHERE journalist_id = $1', [journalistId]);
}

export async function countTicketingLinks(eventId: string, db: Queryable = pool): Promise<{
  total: number;
  scanned: number;
}> {
  const { rows } = await db.query<{ total: string; scanned: string }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE last_scanned_at IS NOT NULL)::text AS scanned
     FROM journalist_ticketing_links WHERE event_id = $1`,
    [eventId],
  );
  return { total: Number(rows[0]?.total ?? 0), scanned: Number(rows[0]?.scanned ?? 0) };
}
