import { pool } from '../pool';
import type { Queryable } from '../types';
import type { RequestRecord, RequestStatusHistoryEntry } from '../../domain';
import {
  GRANTED_INTERVIEW_STATUSES,
  type Lang,
  type RequestStatus,
  type RequestType,
} from '@pr-event-360/core';

interface RequestRow {
  id: string;
  event_id: string;
  journalist_id: string;
  type: RequestType;
  artist_id: string | null;
  slot_id: string | null;
  stage_id: string | null;
  message: string | null;
  status: RequestStatus;
  created_at: string;
}
const map = (r: RequestRow): RequestRecord => ({
  id: r.id,
  eventId: r.event_id,
  journalistId: r.journalist_id,
  type: r.type,
  artistId: r.artist_id,
  slotId: r.slot_id,
  stageId: r.stage_id,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
});
const COLS = `id, event_id, journalist_id, type, artist_id, slot_id, stage_id, message, status, created_at`;

export interface CreateRequestInput {
  eventId: string;
  journalistId: string;
  type: RequestType;
  artistId?: string | null;
  slotId?: string | null;
  stageId?: string | null;
  message?: string | null;
  status: RequestStatus;
}

export async function insertRequest(
  input: CreateRequestInput,
  db: Queryable = pool,
): Promise<RequestRecord> {
  const { rows } = await db.query<RequestRow>(
    `INSERT INTO requests (event_id, journalist_id, type, artist_id, slot_id, stage_id, message, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
    [
      input.eventId,
      input.journalistId,
      input.type,
      input.artistId ?? null,
      input.slotId ?? null,
      input.stageId ?? null,
      input.message ?? null,
      input.status,
    ],
  );
  return map(rows[0]!);
}

export async function findRequestById(id: string, db: Queryable = pool): Promise<RequestRecord | null> {
  const { rows } = await db.query<RequestRow>(`SELECT ${COLS} FROM requests WHERE id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function listRequestsByJournalist(
  journalistId: string,
  db: Queryable = pool,
): Promise<RequestRecord[]> {
  const { rows } = await db.query<RequestRow>(
    `SELECT ${COLS} FROM requests WHERE journalist_id = $1 ORDER BY created_at DESC`,
    [journalistId],
  );
  return rows.map(map);
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  db: Queryable = pool,
): Promise<RequestRecord | null> {
  const { rows } = await db.query<RequestRow>(
    `UPDATE requests SET status = $2 WHERE id = $1 RETURNING ${COLS}`,
    [id, status],
  );
  return rows[0] ? map(rows[0]) : null;
}

// ── Historique ──────────────────────────────────────────────────────
interface HistoryRow {
  id: string;
  request_id: string;
  status: RequestStatus;
  changed_at: string;
  changed_by: string | null;
  note: string | null;
}
export async function addHistory(
  input: { requestId: string; status: RequestStatus; changedBy?: string | null; note?: string | null },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO request_status_history (request_id, status, changed_by, note)
     VALUES ($1, $2, $3, $4)`,
    [input.requestId, input.status, input.changedBy ?? null, input.note ?? null],
  );
}

export async function listHistory(
  requestId: string,
  db: Queryable = pool,
): Promise<RequestStatusHistoryEntry[]> {
  const { rows } = await db.query<HistoryRow>(
    `SELECT id, request_id, status, changed_at, changed_by, note
     FROM request_status_history WHERE request_id = $1 ORDER BY changed_at ASC`,
    [requestId],
  );
  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    status: r.status,
    changedAt: r.changed_at,
    changedBy: r.changed_by,
    note: r.note,
  }));
}

// ── Comptages de quota (dérivés du statut) ──────────────────────────
export async function countGrantedInterviews(
  artistId: string,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT count(*)::int AS count FROM requests
     WHERE type = 'interview' AND artist_id = $1 AND status = ANY($2::request_status[])`,
    [artistId, GRANTED_INTERVIEW_STATUSES],
  );
  return Number(rows[0]!.count);
}

export async function countAcceptedPhotos(stageId: string, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT count(*)::int AS count FROM requests
     WHERE type = 'photo_report' AND stage_id = $1 AND status = 'acceptee'`,
    [stageId],
  );
  return Number(rows[0]!.count);
}

// ── File enrichie (back-office) + scoring inputs ────────────────────
export interface EnrichedRequestRow {
  id: string;
  type: RequestType;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  createdAtMs: number;
  journalistId: string;
  journalistFirstName: string;
  journalistLastName: string | null;
  journalistEmail: string;
  journalistMedia: string | null;
  journalistLang: Lang;
  mediaWeight: number; // 0 si aucun type de média associé
  typeMultiplier: number; // 1 si non configuré
  artistId: string | null;
  artistName: string | null;
  stageId: string | null;
  stageName: string | null;
  slotId: string | null;
  slotDay: string | null;
  slotStart: string | null;
  slotEnd: string | null;
}

interface EnrichedDbRow {
  id: string;
  type: RequestType;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  created_at_ms: string;
  journalist_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  media: string | null;
  lang: Lang;
  media_weight: number | null;
  type_multiplier: string | null;
  artist_id: string | null;
  artist_name: string | null;
  stage_id: string | null;
  stage_name: string | null;
  slot_id: string | null;
  slot_day: string | null;
  slot_start: string | null;
  slot_end: string | null;
}

const ENRICHED_SELECT = `
  SELECT r.id, r.type, r.status, r.message, r.created_at,
         (extract(epoch from r.created_at) * 1000)::bigint AS created_at_ms,
         j.id AS journalist_id, j.first_name, j.last_name, j.email, j.media, j.lang,
         mt.weight AS media_weight,
         rtw.multiplier AS type_multiplier,
         a.id AS artist_id, a.name AS artist_name,
         s.id AS stage_id, s.name AS stage_name,
         sl.id AS slot_id, sl.day AS slot_day, sl.start_time AS slot_start, sl.end_time AS slot_end
  FROM requests r
  JOIN journalists j ON j.id = r.journalist_id
  LEFT JOIN media_types mt ON mt.id = j.media_type_id
  LEFT JOIN request_type_weights rtw ON rtw.event_id = r.event_id AND rtw.type = r.type
  LEFT JOIN artists a ON a.id = r.artist_id
  LEFT JOIN stages s ON s.id = r.stage_id
  LEFT JOIN interview_slots sl ON sl.id = r.slot_id
`;

const mapEnriched = (r: EnrichedDbRow): EnrichedRequestRow => ({
  id: r.id,
  type: r.type,
  status: r.status,
  message: r.message,
  createdAt: r.created_at,
  createdAtMs: Number(r.created_at_ms),
  journalistId: r.journalist_id,
  journalistFirstName: r.first_name,
  journalistLastName: r.last_name,
  journalistEmail: r.email,
  journalistMedia: r.media,
  journalistLang: r.lang,
  mediaWeight: r.media_weight ?? 0,
  typeMultiplier: r.type_multiplier != null ? Number(r.type_multiplier) : 1,
  artistId: r.artist_id,
  artistName: r.artist_name,
  stageId: r.stage_id,
  stageName: r.stage_name,
  slotId: r.slot_id,
  slotDay: r.slot_day,
  slotStart: r.slot_start,
  slotEnd: r.slot_end,
});

export async function listEnrichedByEvent(
  eventId: string,
  db: Queryable = pool,
): Promise<EnrichedRequestRow[]> {
  const { rows } = await db.query<EnrichedDbRow>(`${ENRICHED_SELECT} WHERE r.event_id = $1`, [eventId]);
  return rows.map(mapEnriched);
}

/** Comptages d'interviews accordées, groupés par artiste (pour la file). */
export async function grantedInterviewCountsByEvent(
  eventId: string,
  db: Queryable = pool,
): Promise<Map<string, number>> {
  const { rows } = await db.query<{ artist_id: string; count: string }>(
    `SELECT artist_id, count(*)::int AS count FROM requests
     WHERE event_id = $1 AND type = 'interview' AND artist_id IS NOT NULL
       AND status = ANY($2::request_status[])
     GROUP BY artist_id`,
    [eventId, GRANTED_INTERVIEW_STATUSES],
  );
  return new Map(rows.map((r) => [r.artist_id, Number(r.count)]));
}

/** Comptages de reportages photo acceptés, groupés par scène (pour la file). */
export async function acceptedPhotoCountsByEvent(
  eventId: string,
  db: Queryable = pool,
): Promise<Map<string, number>> {
  const { rows } = await db.query<{ stage_id: string; count: string }>(
    `SELECT stage_id, count(*)::int AS count FROM requests
     WHERE event_id = $1 AND type = 'photo_report' AND stage_id IS NOT NULL AND status = 'acceptee'
     GROUP BY stage_id`,
    [eventId],
  );
  return new Map(rows.map((r) => [r.stage_id, Number(r.count)]));
}

// ── KPIs ────────────────────────────────────────────────────────────
export interface EventKpis {
  total: number;
  byType: Record<RequestType, number>;
  waitlist: number;
}
export async function getEventKpis(eventId: string, db: Queryable = pool): Promise<EventKpis> {
  const { rows } = await db.query<{ type: RequestType; status: RequestStatus; count: string }>(
    `SELECT type, status, count(*)::int AS count FROM requests WHERE event_id = $1 GROUP BY type, status`,
    [eventId],
  );
  const byType: Record<RequestType, number> = { interview: 0, photo_report: 0, video_report: 0 };
  let total = 0;
  let waitlist = 0;
  for (const r of rows) {
    const c = Number(r.count);
    total += c;
    byType[r.type] += c;
    if (r.status === 'liste_attente') waitlist += c;
  }
  return { total, byType, waitlist };
}
