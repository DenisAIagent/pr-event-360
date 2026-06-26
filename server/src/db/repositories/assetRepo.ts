import { pool } from '../pool';
import type { Queryable } from '../types';
import type { AssetKind, EventAsset } from '../../domain';

interface Row {
  id: string;
  event_id: string;
  kind: AssetKind;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  mime: string | null;
  bytes: string | null;
  source: 'upload' | 'link';
  sort: number;
  created_at: string;
}

const COLS =
  'id, event_id, kind, title, description, url, thumbnail_url, mime, bytes, source, sort, created_at';

const map = (r: Row): EventAsset => ({
  id: r.id,
  eventId: r.event_id,
  kind: r.kind,
  title: r.title,
  description: r.description,
  url: r.url,
  thumbnailUrl: r.thumbnail_url,
  mime: r.mime,
  bytes: r.bytes === null ? null : Number(r.bytes),
  source: r.source,
  sort: r.sort,
  createdAt: r.created_at,
});

export async function listAssets(eventId: string, db: Queryable = pool): Promise<EventAsset[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM event_assets WHERE event_id = $1 ORDER BY sort ASC, created_at DESC`,
    [eventId],
  );
  return rows.map(map);
}

export async function createAsset(
  input: {
    eventId: string;
    kind: AssetKind;
    title: string;
    description?: string | null;
    url: string;
    thumbnailUrl?: string | null;
    mime?: string | null;
    bytes?: number | null;
    source?: 'upload' | 'link';
  },
  db: Queryable = pool,
): Promise<EventAsset> {
  const { rows } = await db.query<Row>(
    `INSERT INTO event_assets (event_id, kind, title, description, url, thumbnail_url, mime, bytes, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'upload'))
     RETURNING ${COLS}`,
    [
      input.eventId,
      input.kind,
      input.title,
      input.description ?? null,
      input.url,
      input.thumbnailUrl ?? null,
      input.mime ?? null,
      input.bytes ?? null,
      input.source ?? null,
    ],
  );
  return map(rows[0]!);
}

export async function deleteAsset(eventId: string, id: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM event_assets WHERE event_id = $1 AND id = $2', [eventId, id]);
}
