import { pool } from '../pool';
import type { Queryable } from '../types';
import { AppError } from '../../http/AppError';
import type { Artist, ArtistWindow, InterviewSlot, Stage } from '../../domain';

/**
 * Garde-fou multi-tenant : refuse une scène qui n'appartient pas à l'événement.
 * L'isolation ne peut pas reposer que sur le scoping applicatif — un UUID de scène
 * d'un autre événement passerait la validation Zod (uuid valide) sans ce contrôle.
 */
async function assertStageInEvent(
  stageId: string | null | undefined,
  eventId: string,
  db: Queryable,
): Promise<void> {
  if (!stageId) return;
  const { rowCount } = await db.query('SELECT 1 FROM stages WHERE id = $1 AND event_id = $2', [stageId, eventId]);
  if (!rowCount) throw AppError.badRequest('Scène introuvable pour cet événement.');
}

// ── Stages ──────────────────────────────────────────────────────────
interface StageRow {
  id: string;
  event_id: string;
  name: string;
}
const mapStage = (r: StageRow): Stage => ({ id: r.id, eventId: r.event_id, name: r.name });

export async function insertStage(
  input: { eventId: string; name: string },
  db: Queryable = pool,
): Promise<Stage> {
  const { rows } = await db.query<StageRow>(
    `INSERT INTO stages (event_id, name) VALUES ($1, $2) RETURNING id, event_id, name`,
    [input.eventId, input.name],
  );
  return mapStage(rows[0]!);
}

export async function listStages(eventId: string, db: Queryable = pool): Promise<Stage[]> {
  const { rows } = await db.query<StageRow>(
    `SELECT id, event_id, name FROM stages WHERE event_id = $1 ORDER BY name`,
    [eventId],
  );
  return rows.map(mapStage);
}

export async function findStage(
  id: string,
  eventId: string,
  db: Queryable = pool,
): Promise<Stage | null> {
  const { rows } = await db.query<StageRow>(
    `SELECT id, event_id, name FROM stages WHERE id = $1 AND event_id = $2`,
    [id, eventId],
  );
  return rows[0] ? mapStage(rows[0]) : null;
}

/** Renomme une scène. Scopé à l'événement. */
export async function updateStage(
  id: string,
  eventId: string,
  name: string,
  db: Queryable = pool,
): Promise<Stage | null> {
  const { rows } = await db.query<StageRow>(
    `UPDATE stages SET name = $3 WHERE id = $1 AND event_id = $2 RETURNING id, event_id, name`,
    [id, eventId, name],
  );
  return rows[0] ? mapStage(rows[0]) : null;
}

/** Supprime une scène (les artistes rattachés sont dé-rattachés : stage_id → NULL). */
export async function deleteStage(id: string, eventId: string, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM stages WHERE id = $1 AND event_id = $2', [id, eventId]);
  return rowCount ?? 0;
}

// ── Artists ─────────────────────────────────────────────────────────
interface ArtistRow {
  id: string;
  event_id: string;
  name: string;
  stage_id: string | null;
  itw_quota: number | null;
  photo_quota: number | null;
  video_quota: number | null;
}
const ARTIST_COLS = 'id, event_id, name, stage_id, itw_quota, photo_quota, video_quota';
const mapArtist = (r: ArtistRow): Artist => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  stageId: r.stage_id,
  itwQuota: r.itw_quota,
  photoQuota: r.photo_quota,
  videoQuota: r.video_quota,
});

interface ArtistInput {
  name: string;
  stageId?: string | null;
  itwQuota?: number | null;
  photoQuota?: number | null;
  videoQuota?: number | null;
}

export async function insertArtist(
  input: ArtistInput & { eventId: string },
  db: Queryable = pool,
): Promise<Artist> {
  await assertStageInEvent(input.stageId, input.eventId, db);
  const { rows } = await db.query<ArtistRow>(
    `INSERT INTO artists (event_id, name, stage_id, itw_quota, photo_quota, video_quota)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${ARTIST_COLS}`,
    [
      input.eventId,
      input.name,
      input.stageId ?? null,
      input.itwQuota ?? null,
      input.photoQuota ?? null,
      input.videoQuota ?? null,
    ],
  );
  return mapArtist(rows[0]!);
}

export async function listArtists(eventId: string, db: Queryable = pool): Promise<Artist[]> {
  const { rows } = await db.query<ArtistRow>(
    `SELECT ${ARTIST_COLS} FROM artists WHERE event_id = $1 ORDER BY name`,
    [eventId],
  );
  return rows.map(mapArtist);
}

export async function findArtist(
  id: string,
  eventId: string,
  db: Queryable = pool,
): Promise<Artist | null> {
  const { rows } = await db.query<ArtistRow>(
    `SELECT ${ARTIST_COLS} FROM artists WHERE id = $1 AND event_id = $2`,
    [id, eventId],
  );
  return rows[0] ? mapArtist(rows[0]) : null;
}

/** Correction d'un artiste (nom, scène, quotas interviews/photo/vidéo). Scopé à l'événement. */
export async function updateArtist(
  id: string,
  eventId: string,
  input: ArtistInput,
  db: Queryable = pool,
): Promise<Artist | null> {
  await assertStageInEvent(input.stageId, eventId, db);
  const { rows } = await db.query<ArtistRow>(
    `UPDATE artists SET name = $3, stage_id = $4, itw_quota = $5, photo_quota = $6, video_quota = $7
     WHERE id = $1 AND event_id = $2
     RETURNING ${ARTIST_COLS}`,
    [
      id,
      eventId,
      input.name,
      input.stageId ?? null,
      input.itwQuota ?? null,
      input.photoQuota ?? null,
      input.videoQuota ?? null,
    ],
  );
  return rows[0] ? mapArtist(rows[0]) : null;
}

/** Supprime un artiste (tranches/créneaux en cascade ; demandes liées dé-rattachées). */
export async function deleteArtist(id: string, eventId: string, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM artists WHERE id = $1 AND event_id = $2', [id, eventId]);
  return rowCount ?? 0;
}

// ── Windows ─────────────────────────────────────────────────────────
interface WindowRow {
  id: string;
  artist_id: string;
  day: string;
  start_time: string;
  end_time: string;
}
const mapWindow = (r: WindowRow): ArtistWindow => ({
  id: r.id,
  artistId: r.artist_id,
  day: r.day,
  startTime: r.start_time,
  endTime: r.end_time,
});

export async function insertWindow(
  input: { artistId: string; day: string; startTime: string; endTime: string },
  db: Queryable = pool,
): Promise<ArtistWindow> {
  const { rows } = await db.query<WindowRow>(
    `INSERT INTO artist_windows (artist_id, day, start_time, end_time)
     VALUES ($1, $2, $3, $4) RETURNING id, artist_id, day, start_time, end_time`,
    [input.artistId, input.day, input.startTime, input.endTime],
  );
  return mapWindow(rows[0]!);
}

export async function listWindows(artistId: string, db: Queryable = pool): Promise<ArtistWindow[]> {
  const { rows } = await db.query<WindowRow>(
    `SELECT id, artist_id, day, start_time, end_time
     FROM artist_windows WHERE artist_id = $1 ORDER BY day, start_time`,
    [artistId],
  );
  return rows.map(mapWindow);
}

// ── Slots (générés) ─────────────────────────────────────────────────
interface SlotRow {
  id: string;
  artist_id: string;
  window_id: string;
  day: string;
  start_time: string;
  end_time: string;
}
const mapSlot = (r: SlotRow): InterviewSlot => ({
  id: r.id,
  artistId: r.artist_id,
  windowId: r.window_id,
  day: r.day,
  startTime: r.start_time,
  endTime: r.end_time,
});

/** Insère en lot les créneaux générés pour une fenêtre. */
export async function insertSlots(
  slots: ReadonlyArray<{ artistId: string; windowId: string; day: string; startTime: string; endTime: string }>,
  db: Queryable = pool,
): Promise<InterviewSlot[]> {
  if (slots.length === 0) return [];
  const values: unknown[] = [];
  const tuples = slots.map((s, i) => {
    const o = i * 5;
    values.push(s.artistId, s.windowId, s.day, s.startTime, s.endTime);
    return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`;
  });
  const { rows } = await db.query<SlotRow>(
    `INSERT INTO interview_slots (artist_id, window_id, day, start_time, end_time)
     VALUES ${tuples.join(', ')}
     RETURNING id, artist_id, window_id, day, start_time, end_time`,
    values,
  );
  return rows.map(mapSlot);
}

export async function listSlotsByArtist(
  artistId: string,
  db: Queryable = pool,
): Promise<InterviewSlot[]> {
  const { rows } = await db.query<SlotRow>(
    `SELECT id, artist_id, window_id, day, start_time, end_time
     FROM interview_slots WHERE artist_id = $1 ORDER BY day, start_time`,
    [artistId],
  );
  return rows.map(mapSlot);
}

export async function findSlot(
  id: string,
  db: Queryable = pool,
): Promise<InterviewSlot | null> {
  const { rows } = await db.query<SlotRow>(
    `SELECT id, artist_id, window_id, day, start_time, end_time FROM interview_slots WHERE id = $1`,
    [id],
  );
  return rows[0] ? mapSlot(rows[0]) : null;
}
