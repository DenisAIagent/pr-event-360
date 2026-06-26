import { pool } from '../pool';
import type { Queryable } from '../types';
import type { PressRelease } from '../../domain';

interface Row {
  id: string;
  event_id: string;
  title: string;
  body_html: string;
  published_at: string | null;
  status: 'draft' | 'published';
  created_at: string;
}

const COLS = 'id, event_id, title, body_html, published_at, status, created_at';

const map = (r: Row): PressRelease => ({
  id: r.id,
  eventId: r.event_id,
  title: r.title,
  bodyHtml: r.body_html,
  publishedAt: r.published_at,
  status: r.status,
  createdAt: r.created_at,
});

export async function listPressReleases(eventId: string, db: Queryable = pool): Promise<PressRelease[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_releases WHERE event_id = $1 ORDER BY COALESCE(published_at, created_at) DESC`,
    [eventId],
  );
  return rows.map(map);
}

export async function listPublishedPressReleases(
  eventId: string,
  db: Queryable = pool,
): Promise<PressRelease[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_releases
     WHERE event_id = $1 AND status = 'published'
     ORDER BY COALESCE(published_at, created_at) DESC`,
    [eventId],
  );
  return rows.map(map);
}

export async function findPressRelease(
  eventId: string,
  id: string,
  db: Queryable = pool,
): Promise<PressRelease | null> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_releases WHERE event_id = $1 AND id = $2`,
    [eventId, id],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function createPressRelease(
  input: { eventId: string; title: string; bodyHtml: string; status: 'draft' | 'published' },
  db: Queryable = pool,
): Promise<PressRelease> {
  const { rows } = await db.query<Row>(
    `INSERT INTO press_releases (event_id, title, body_html, status, published_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'published' THEN now() ELSE NULL END)
     RETURNING ${COLS}`,
    [input.eventId, input.title, input.bodyHtml, input.status],
  );
  return map(rows[0]!);
}

export async function updatePressRelease(
  eventId: string,
  id: string,
  input: { title: string; bodyHtml: string; status: 'draft' | 'published' },
  db: Queryable = pool,
): Promise<PressRelease | null> {
  // Fixe published_at à la première publication, le conserve ensuite.
  const { rows } = await db.query<Row>(
    `UPDATE press_releases
     SET title = $3, body_html = $4, status = $5,
         published_at = CASE
           WHEN $5 = 'published' AND published_at IS NULL THEN now()
           WHEN $5 = 'draft' THEN NULL
           ELSE published_at END
     WHERE event_id = $1 AND id = $2
     RETURNING ${COLS}`,
    [eventId, id, input.title, input.bodyHtml, input.status],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function deletePressRelease(
  eventId: string,
  id: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('DELETE FROM press_releases WHERE event_id = $1 AND id = $2', [eventId, id]);
}
