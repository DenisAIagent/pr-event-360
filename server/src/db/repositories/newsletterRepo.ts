import { pool } from '../pool';
import type { Queryable } from '../types';
import type { Newsletter } from '../../domain';

interface Row {
  id: string;
  event_id: string;
  subject: string;
  body_html: string;
  status: 'draft' | 'sent';
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
}

const COLS = 'id, event_id, subject, body_html, status, recipient_count, sent_at, created_at';

const map = (r: Row): Newsletter => ({
  id: r.id,
  eventId: r.event_id,
  subject: r.subject,
  bodyHtml: r.body_html,
  status: r.status,
  recipientCount: r.recipient_count,
  sentAt: r.sent_at,
  createdAt: r.created_at,
});

export async function listNewsletters(eventId: string, db: Queryable = pool): Promise<Newsletter[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM newsletters WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId],
  );
  return rows.map(map);
}

export async function findNewsletter(
  eventId: string,
  id: string,
  db: Queryable = pool,
): Promise<Newsletter | null> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM newsletters WHERE event_id = $1 AND id = $2`,
    [eventId, id],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function createNewsletter(
  input: { eventId: string; subject: string; bodyHtml: string },
  db: Queryable = pool,
): Promise<Newsletter> {
  const { rows } = await db.query<Row>(
    `INSERT INTO newsletters (event_id, subject, body_html) VALUES ($1, $2, $3) RETURNING ${COLS}`,
    [input.eventId, input.subject, input.bodyHtml],
  );
  return map(rows[0]!);
}

export async function updateNewsletter(
  eventId: string,
  id: string,
  input: { subject: string; bodyHtml: string },
  db: Queryable = pool,
): Promise<Newsletter | null> {
  const { rows } = await db.query<Row>(
    `UPDATE newsletters SET subject = $3, body_html = $4
     WHERE event_id = $1 AND id = $2 AND status = 'draft'
     RETURNING ${COLS}`,
    [eventId, id, input.subject, input.bodyHtml],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function markNewsletterSent(
  eventId: string,
  id: string,
  recipientCount: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE newsletters SET status = 'sent', recipient_count = $3, sent_at = now()
     WHERE event_id = $1 AND id = $2`,
    [eventId, id, recipientCount],
  );
}

/** Supprime un brouillon. Les newsletters déjà envoyées sont conservées (archive). */
export async function deleteNewsletter(
  eventId: string,
  id: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM newsletters WHERE event_id = $1 AND id = $2 AND status = 'draft'`,
    [eventId, id],
  );
  return (rowCount ?? 0) > 0;
}
