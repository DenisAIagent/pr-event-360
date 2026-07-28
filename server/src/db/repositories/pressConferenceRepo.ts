import { pool } from '../pool';
import type { Queryable } from '../types';
import type {
  AccreditationType,
  PressConferenceRegistrationMode,
  PressConferenceRegistrationStatus,
  PressConferenceStatus,
} from '@pr-event-360/core';
import type { PressConference, PressConferenceRegistration } from '../../domain';

interface ConferenceRow {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  starts_at: string | Date;
  ends_at: string | Date | null;
  venue: string | null;
  capacity: number | null;
  registration_mode: PressConferenceRegistrationMode;
  status: PressConferenceStatus;
  allowed_accreditation_types: AccreditationType[] | string;
  embargo_until: string | Date | null;
  livestream_url: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const CONFERENCE_COLS = `id, event_id, title, description, starts_at, ends_at, venue, capacity,
  registration_mode, status, allowed_accreditation_types, embargo_until, livestream_url,
  created_at, updated_at`;

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function parseAccreditationTypes(value: AccreditationType[] | string): AccreditationType[] {
  if (Array.isArray(value)) return value;
  return value.replace(/^\{|\}$/g, '').split(',').filter(Boolean) as AccreditationType[];
}

const mapConference = (row: ConferenceRow): PressConference => ({
  id: row.id,
  eventId: row.event_id,
  title: row.title,
  description: row.description,
  startsAt: iso(row.starts_at),
  endsAt: row.ends_at ? iso(row.ends_at) : null,
  venue: row.venue,
  capacity: row.capacity,
  registrationMode: row.registration_mode,
  status: row.status,
  allowedAccreditationTypes: parseAccreditationTypes(row.allowed_accreditation_types),
  embargoUntil: row.embargo_until ? iso(row.embargo_until) : null,
  livestreamUrl: row.livestream_url,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

export interface SavePressConferenceInput {
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  capacity?: number | null;
  registrationMode: PressConferenceRegistrationMode;
  status: PressConferenceStatus;
  allowedAccreditationTypes: AccreditationType[];
  embargoUntil?: string | null;
  livestreamUrl?: string | null;
}

export async function insertPressConference(
  eventId: string,
  input: SavePressConferenceInput,
  db: Queryable = pool,
): Promise<PressConference> {
  const { rows } = await db.query<ConferenceRow>(
    `INSERT INTO press_conferences
      (event_id, title, description, starts_at, ends_at, venue, capacity, registration_mode,
       status, allowed_accreditation_types, embargo_until, livestream_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::accreditation_type[],$11,$12)
     RETURNING ${CONFERENCE_COLS}`,
    [
      eventId,
      input.title,
      input.description ?? null,
      input.startsAt,
      input.endsAt ?? null,
      input.venue ?? null,
      input.capacity ?? null,
      input.registrationMode,
      input.status,
      input.allowedAccreditationTypes,
      input.embargoUntil ?? null,
      input.livestreamUrl ?? null,
    ],
  );
  return mapConference(rows[0]!);
}

export async function updatePressConference(
  id: string,
  eventId: string,
  input: SavePressConferenceInput,
  db: Queryable = pool,
): Promise<PressConference | null> {
  const { rows } = await db.query<ConferenceRow>(
    `UPDATE press_conferences SET
       title=$3, description=$4, starts_at=$5, ends_at=$6, venue=$7, capacity=$8,
       registration_mode=$9, status=$10, allowed_accreditation_types=$11::accreditation_type[],
       embargo_until=$12, livestream_url=$13, updated_at=now()
     WHERE id=$1 AND event_id=$2
     RETURNING ${CONFERENCE_COLS}`,
    [
      id,
      eventId,
      input.title,
      input.description ?? null,
      input.startsAt,
      input.endsAt ?? null,
      input.venue ?? null,
      input.capacity ?? null,
      input.registrationMode,
      input.status,
      input.allowedAccreditationTypes,
      input.embargoUntil ?? null,
      input.livestreamUrl ?? null,
    ],
  );
  return rows[0] ? mapConference(rows[0]) : null;
}

export async function findPressConference(
  id: string,
  eventId: string,
  db: Queryable = pool,
  lock = false,
): Promise<PressConference | null> {
  const { rows } = await db.query<ConferenceRow>(
    `SELECT ${CONFERENCE_COLS} FROM press_conferences
     WHERE id=$1 AND event_id=$2${lock ? ' FOR UPDATE' : ''}`,
    [id, eventId],
  );
  return rows[0] ? mapConference(rows[0]) : null;
}

export async function listPressConferences(
  eventId: string,
  db: Queryable = pool,
): Promise<PressConference[]> {
  const { rows } = await db.query<ConferenceRow>(
    `SELECT ${CONFERENCE_COLS} FROM press_conferences WHERE event_id=$1 ORDER BY starts_at ASC`,
    [eventId],
  );
  return rows.map(mapConference);
}

export async function deletePressConference(
  id: string,
  eventId: string,
  db: Queryable = pool,
): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM press_conferences WHERE id=$1 AND event_id=$2', [id, eventId]);
  return rowCount ?? 0;
}

export async function replaceConferenceParticipants(
  conferenceId: string,
  eventId: string,
  artistIds: string[],
  db: Queryable = pool,
): Promise<number> {
  await db.query('DELETE FROM press_conference_participants WHERE conference_id=$1', [conferenceId]);
  if (artistIds.length === 0) return 0;
  const { rowCount } = await db.query(
    `INSERT INTO press_conference_participants (conference_id, artist_id)
     SELECT $1, a.id FROM artists a WHERE a.event_id=$2 AND a.id=ANY($3::uuid[])`,
    [conferenceId, eventId, artistIds],
  );
  return rowCount ?? 0;
}

export async function listConferenceParticipants(
  conferenceId: string,
  db: Queryable = pool,
): Promise<Array<{ id: string; name: string }>> {
  const { rows } = await db.query<{ id: string; name: string }>(
    `SELECT a.id, a.name FROM artists a
     JOIN press_conference_participants p ON p.artist_id=a.id
     WHERE p.conference_id=$1 ORDER BY a.name`,
    [conferenceId],
  );
  return rows;
}

interface RegistrationRow {
  conference_id: string;
  journalist_id: string;
  status: PressConferenceRegistrationStatus;
  source_request_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const REGISTRATION_COLS = `conference_id, journalist_id, status, source_request_id, created_at, updated_at`;
const mapRegistration = (row: RegistrationRow): PressConferenceRegistration => ({
  conferenceId: row.conference_id,
  journalistId: row.journalist_id,
  status: row.status,
  sourceRequestId: row.source_request_id,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

export async function findConferenceRegistration(
  conferenceId: string,
  journalistId: string,
  db: Queryable = pool,
): Promise<PressConferenceRegistration | null> {
  const { rows } = await db.query<RegistrationRow>(
    `SELECT ${REGISTRATION_COLS} FROM press_conference_registrations
     WHERE conference_id=$1 AND journalist_id=$2`,
    [conferenceId, journalistId],
  );
  return rows[0] ? mapRegistration(rows[0]) : null;
}

export async function upsertConferenceRegistration(
  conferenceId: string,
  journalistId: string,
  status: PressConferenceRegistrationStatus,
  db: Queryable = pool,
  sourceRequestId?: string | null,
): Promise<PressConferenceRegistration> {
  const { rows } = await db.query<RegistrationRow>(
    `INSERT INTO press_conference_registrations (conference_id, journalist_id, status, source_request_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (conference_id, journalist_id) DO UPDATE
       SET status=EXCLUDED.status,
           source_request_id=COALESCE(EXCLUDED.source_request_id, press_conference_registrations.source_request_id),
           updated_at=now()
     RETURNING ${REGISTRATION_COLS}`,
    [conferenceId, journalistId, status, sourceRequestId ?? null],
  );
  return mapRegistration(rows[0]!);
}

export async function countConferenceOccupied(
  conferenceId: string,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ count: number | string }>(
    `SELECT count(*)::int AS count FROM press_conference_registrations
     WHERE conference_id=$1 AND status IN ('registered','checked_in')`,
    [conferenceId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function registrationCounts(
  conferenceId: string,
  db: Queryable = pool,
): Promise<Record<PressConferenceRegistrationStatus, number>> {
  const base: Record<PressConferenceRegistrationStatus, number> = {
    invited: 0, pending: 0, registered: 0, waitlisted: 0, declined: 0, checked_in: 0, cancelled: 0,
  };
  const { rows } = await db.query<{ status: PressConferenceRegistrationStatus; count: number | string }>(
    `SELECT status, count(*)::int AS count FROM press_conference_registrations
     WHERE conference_id=$1 GROUP BY status`,
    [conferenceId],
  );
  for (const row of rows) base[row.status] = Number(row.count);
  return base;
}

export interface ConferenceRegistrationDetail extends PressConferenceRegistration {
  firstName: string;
  lastName: string | null;
  email: string;
  media: string | null;
  accreditationType: AccreditationType | null;
}

export async function listConferenceRegistrations(
  conferenceId: string,
  eventId: string,
  db: Queryable = pool,
): Promise<ConferenceRegistrationDetail[]> {
  const { rows } = await db.query<RegistrationRow & {
    first_name: string; last_name: string | null; email: string; media: string | null;
    accreditation_type: AccreditationType | null;
  }>(
    `SELECT r.${REGISTRATION_COLS.split(', ').join(', r.')},
            j.first_name, j.last_name, j.email, j.media, j.accreditation_type
     FROM press_conference_registrations r
     JOIN press_conferences c ON c.id=r.conference_id
     JOIN journalists j ON j.id=r.journalist_id AND j.event_id=c.event_id
     WHERE r.conference_id=$1 AND c.event_id=$2
     ORDER BY r.created_at ASC`,
    [conferenceId, eventId],
  );
  return rows.map((row) => ({
    ...mapRegistration(row),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    media: row.media,
    accreditationType: row.accreditation_type,
  }));
}

export async function findFirstWaitlisted(
  conferenceId: string,
  db: Queryable = pool,
): Promise<PressConferenceRegistration | null> {
  const { rows } = await db.query<RegistrationRow>(
    `SELECT ${REGISTRATION_COLS} FROM press_conference_registrations
     WHERE conference_id=$1 AND status='waitlisted'
     ORDER BY updated_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`,
    [conferenceId],
  );
  return rows[0] ? mapRegistration(rows[0]) : null;
}
