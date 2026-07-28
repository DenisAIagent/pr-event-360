import { pool } from '../pool';
import type { Queryable } from '../types';
import type { NotificationRecord } from '../../domain';
import type { Lang } from '@pr-event-360/core';

interface NotificationRow {
  id: string;
  event_id: string;
  journalist_id: string | null;
  channel: 'email' | 'sms';
  trigger_key: string;
  lang: Lang;
  to_address: string;
  subject: string | null;
  body: string;
  provider: string;
  status: string;
  created_at: string;
}
const map = (r: NotificationRow): NotificationRecord => ({
  id: r.id,
  eventId: r.event_id,
  journalistId: r.journalist_id,
  channel: r.channel,
  triggerKey: r.trigger_key,
  lang: r.lang,
  toAddress: r.to_address,
  subject: r.subject,
  body: r.body,
  provider: r.provider,
  status: r.status,
  createdAt: r.created_at,
});
const COLS = `id, event_id, journalist_id, channel, trigger_key, lang, to_address, subject, body, provider, status, created_at`;

export async function insertNotification(
  input: {
    eventId: string;
    journalistId?: string | null;
    channel: 'email' | 'sms';
    triggerKey: string;
    lang: Lang;
    toAddress: string;
    subject?: string | null;
    body: string;
    provider: string;
    status: string;
  },
  db: Queryable = pool,
): Promise<NotificationRecord> {
  const { rows } = await db.query<NotificationRow>(
    `INSERT INTO notifications
      (event_id, journalist_id, channel, trigger_key, lang, to_address, subject, body, provider, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLS}`,
    [
      input.eventId,
      input.journalistId ?? null,
      input.channel,
      input.triggerKey,
      input.lang,
      input.toAddress,
      input.subject ?? null,
      input.body,
      input.provider,
      input.status,
    ],
  );
  return map(rows[0]!);
}

export interface NotificationPage {
  items: NotificationRecord[];
  /** Curseur keyset vers la page suivante (null = fin de liste). */
  nextCursor: string | null;
}

/**
 * Messages d'un événement, paginés par CURSEUR keyset (created_at, id) : la
 * table croît en continu (une ligne par email/SMS), un chargement intégral est
 * donc proscrit. `before` = curseur renvoyé par la page précédente.
 */
export async function listNotificationsByEvent(
  eventId: string,
  opts: { limit?: number; before?: string } = {},
  db: Queryable = pool,
): Promise<NotificationPage> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  let beforeTs: string | null = null;
  let beforeId: string | null = null;
  if (opts.before) {
    const [ts, id] = opts.before.split('~');
    if (ts && id && !Number.isNaN(Date.parse(ts))) {
      beforeTs = ts;
      beforeId = id;
    }
  }
  const { rows } = await db.query<NotificationRow>(
    `SELECT ${COLS} FROM notifications
     WHERE event_id = $1
       AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
     ORDER BY created_at DESC, id DESC
     LIMIT $4`,
    [eventId, beforeTs, beforeId, limit + 1],
  );
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(map),
    nextCursor: hasMore && last ? `${new Date(last.created_at).toISOString()}~${last.id}` : null,
  };
}

/**
 * Purge RGPD/rétention : supprime les notifications plus anciennes que `months`
 * mois (table à croissance continue — une ligne par email/SMS envoyé). Renvoie
 * le nombre de lignes supprimées. Aligné sur la rétention du journal d'audit.
 */
export async function purgeNotificationsOlderThan(
  months: number,
  db: Queryable = pool,
): Promise<number> {
  const { rowCount } = await db.query(
    `DELETE FROM notifications WHERE created_at < now() - make_interval(months => $1)`,
    [months],
  );
  return rowCount ?? 0;
}
