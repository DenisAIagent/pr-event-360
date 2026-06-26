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

export async function listNotificationsByEvent(
  eventId: string,
  db: Queryable = pool,
): Promise<NotificationRecord[]> {
  const { rows } = await db.query<NotificationRow>(
    `SELECT ${COLS} FROM notifications WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId],
  );
  return rows.map(map);
}
