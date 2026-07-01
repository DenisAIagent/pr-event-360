import { pool } from '../pool';
import type { Queryable } from '../types';
import type { MediaCategory, PressCoverage } from '../../domain';

interface Row {
  id: string;
  event_id: string;
  journalist_id: string;
  media_category: MediaCategory;
  is_upload: boolean;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  archive_consent: boolean;
  promo_consent: boolean;
  created_at: string;
}

const COLS =
  'id, event_id, journalist_id, media_category, is_upload, url, thumbnail_url, title, archive_consent, promo_consent, created_at';

const map = (r: Row): PressCoverage => ({
  id: r.id,
  eventId: r.event_id,
  journalistId: r.journalist_id,
  mediaCategory: r.media_category,
  isUpload: r.is_upload,
  url: r.url,
  thumbnailUrl: r.thumbnail_url,
  title: r.title,
  archiveConsent: r.archive_consent,
  promoConsent: r.promo_consent,
  createdAt: r.created_at,
});

export interface CoverageInput {
  eventId: string;
  journalistId: string;
  mediaCategory: MediaCategory;
  isUpload: boolean;
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  archiveConsent: boolean;
  promoConsent: boolean;
}

export async function createCoverage(input: CoverageInput, db: Queryable = pool): Promise<PressCoverage> {
  const { rows } = await db.query<Row>(
    `INSERT INTO press_coverage
       (event_id, journalist_id, media_category, is_upload, url, thumbnail_url, title, archive_consent, promo_consent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.eventId,
      input.journalistId,
      input.mediaCategory,
      input.isUpload,
      input.url,
      input.thumbnailUrl ?? null,
      input.title ?? null,
      input.archiveConsent,
      input.promoConsent,
    ],
  );
  return map(rows[0]!);
}

export async function listCoverageByJournalist(
  journalistId: string,
  db: Queryable = pool,
): Promise<PressCoverage[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_coverage WHERE journalist_id = $1 ORDER BY created_at DESC`,
    [journalistId],
  );
  return rows.map(map);
}

export async function listCoverageByEvent(eventId: string, db: Queryable = pool): Promise<PressCoverage[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_coverage WHERE event_id = $1 ORDER BY media_category ASC, created_at DESC`,
    [eventId],
  );
  return rows.map(map);
}

/**
 * Suppression d'une retombée, **toujours** restreinte à un périmètre (événement côté back-office,
 * ou journaliste côté espace) afin d'empêcher toute suppression cross-tenant par simple UUID.
 * Retourne `true` si une ligne a bien été supprimée dans ce périmètre, `false` sinon.
 */
export async function deleteCoverage(
  id: string,
  scope: { eventId?: string; journalistId?: string },
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM press_coverage
     WHERE id = $1
       AND ($2::uuid IS NULL OR event_id = $2)
       AND ($3::uuid IS NULL OR journalist_id = $3)`,
    [id, scope.eventId ?? null, scope.journalistId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

export interface CoverageStat {
  journalistId: string;
  count: number;
  lastAt: string | null;
}

/** Par journaliste : nombre de retombées + dernière soumission (pour le suivi des envois). */
export async function coverageStatsByEvent(eventId: string, db: Queryable = pool): Promise<CoverageStat[]> {
  const { rows } = await db.query<{ journalist_id: string; count: string; last_at: string | null }>(
    `SELECT journalist_id, count(*)::int AS count, max(created_at) AS last_at
     FROM press_coverage WHERE event_id = $1 GROUP BY journalist_id`,
    [eventId],
  );
  return rows.map((r) => ({ journalistId: r.journalist_id, count: Number(r.count), lastAt: r.last_at }));
}
