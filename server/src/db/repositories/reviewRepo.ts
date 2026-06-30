import { pool } from '../pool';
import type { Queryable } from '../types';
import type { AppReview, ReviewStatus } from '../../domain';

interface Row {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  author_name: string;
  author_role: string | null;
  author_org: string | null;
  rating: number;
  quote: string;
  consent_public: boolean;
  status: ReviewStatus;
  created_at: string;
  reviewed_at: string | null;
}

const COLS =
  'id, user_id, organization_id, author_name, author_role, author_org, rating, quote, consent_public, status, created_at, reviewed_at';

const map = (r: Row): AppReview => ({
  id: r.id,
  userId: r.user_id,
  organizationId: r.organization_id,
  authorName: r.author_name,
  authorRole: r.author_role,
  authorOrg: r.author_org,
  rating: r.rating,
  quote: r.quote,
  consentPublic: r.consent_public,
  status: r.status,
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at,
});

export async function findReviewByUser(userId: string, db: Queryable = pool): Promise<AppReview | null> {
  const { rows } = await db.query<Row>(`SELECT ${COLS} FROM app_reviews WHERE user_id = $1`, [userId]);
  return rows[0] ? map(rows[0]) : null;
}

export interface ReviewInput {
  userId: string;
  organizationId: string | null;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  rating: number;
  quote: string;
  consentPublic: boolean;
}

/** Crée ou met à jour l'avis de l'utilisateur ; toute modification repasse en modération. */
export async function upsertReview(input: ReviewInput, db: Queryable = pool): Promise<AppReview> {
  const { rows } = await db.query<Row>(
    `INSERT INTO app_reviews (user_id, organization_id, author_name, author_role, author_org, rating, quote, consent_public, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     ON CONFLICT (user_id) WHERE user_id IS NOT NULL
     DO UPDATE SET organization_id = EXCLUDED.organization_id, author_name = EXCLUDED.author_name,
       author_role = EXCLUDED.author_role, author_org = EXCLUDED.author_org, rating = EXCLUDED.rating,
       quote = EXCLUDED.quote, consent_public = EXCLUDED.consent_public, status = 'pending', reviewed_at = NULL
     RETURNING ${COLS}`,
    [
      input.userId,
      input.organizationId,
      input.authorName,
      input.authorRole,
      input.authorOrg,
      input.rating,
      input.quote,
      input.consentPublic,
    ],
  );
  return map(rows[0]!);
}

/** Tous les avis pour la modération (super-admin), les plus récents d'abord. */
export async function listAllReviews(db: Queryable = pool): Promise<AppReview[]> {
  const { rows } = await db.query<Row>(`SELECT ${COLS} FROM app_reviews ORDER BY created_at DESC LIMIT 500`);
  return rows.map(map);
}

/** Avis publiables sur la landing : approuvés ET consentis. */
export async function listPublicReviews(db: Queryable = pool): Promise<AppReview[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM app_reviews
     WHERE status = 'approved' AND consent_public = true
     ORDER BY COALESCE(reviewed_at, created_at) DESC LIMIT 24`,
  );
  return rows.map(map);
}

export async function setReviewStatus(
  id: string,
  status: ReviewStatus,
  db: Queryable = pool,
): Promise<AppReview | null> {
  const { rows } = await db.query<Row>(
    `UPDATE app_reviews SET status = $2, reviewed_at = now() WHERE id = $1 RETURNING ${COLS}`,
    [id, status],
  );
  return rows[0] ? map(rows[0]) : null;
}
