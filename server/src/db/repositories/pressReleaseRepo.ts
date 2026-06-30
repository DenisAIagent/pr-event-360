import { pool } from '../pool';
import type { Queryable } from '../types';
import type { PressRelease } from '../../domain';
import { uniqueSlug } from '../../lib/slug';

interface Row {
  id: string;
  event_id: string;
  title: string;
  body_html: string;
  slug: string;
  seo_description: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  status: 'draft' | 'published';
  created_at: string;
}

const COLS =
  'id, event_id, title, body_html, slug, seo_description, cover_image_url, published_at, status, created_at';

const map = (r: Row): PressRelease => ({
  id: r.id,
  eventId: r.event_id,
  title: r.title,
  bodyHtml: r.body_html,
  slug: r.slug,
  seoDescription: r.seo_description,
  coverImageUrl: r.cover_image_url,
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

export async function findPressReleaseBySlug(
  eventId: string,
  slug: string,
  db: Queryable = pool,
): Promise<PressRelease | null> {
  const { rows } = await db.query<Row>(
    `SELECT ${COLS} FROM press_releases WHERE event_id = $1 AND slug = $2`,
    [eventId, slug],
  );
  return rows[0] ? map(rows[0]) : null;
}

/** Slugs déjà utilisés pour un événement (pour garantir l'unicité). */
async function takenSlugs(eventId: string, db: Queryable, exceptId?: string): Promise<Set<string>> {
  const { rows } = await db.query<{ slug: string }>(
    `SELECT slug FROM press_releases WHERE event_id = $1 AND ($2::uuid IS NULL OR id <> $2)`,
    [eventId, exceptId ?? null],
  );
  return new Set(rows.map((r) => r.slug));
}

export interface PressInput {
  eventId: string;
  title: string;
  bodyHtml: string;
  status: 'draft' | 'published';
  slug?: string | null;
  seoDescription?: string | null;
  coverImageUrl?: string | null;
}

export async function createPressRelease(input: PressInput, db: Queryable = pool): Promise<PressRelease> {
  const slug = uniqueSlug(input.slug || input.title, await takenSlugs(input.eventId, db));
  const { rows } = await db.query<Row>(
    `INSERT INTO press_releases (event_id, title, body_html, slug, seo_description, cover_image_url, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'published' THEN now() ELSE NULL END)
     RETURNING ${COLS}`,
    [
      input.eventId,
      input.title,
      input.bodyHtml,
      slug,
      input.seoDescription ?? null,
      input.coverImageUrl ?? null,
      input.status,
    ],
  );
  return map(rows[0]!);
}

export async function updatePressRelease(
  eventId: string,
  id: string,
  input: Omit<PressInput, 'eventId'>,
  db: Queryable = pool,
): Promise<PressRelease | null> {
  // Le slug n'est régénéré que si le RP le change explicitement (sinon les URLs publiées restent stables).
  const slug = input.slug
    ? uniqueSlug(input.slug, await takenSlugs(eventId, db, id))
    : null;
  // Fixe published_at à la première publication, le conserve ensuite.
  const { rows } = await db.query<Row>(
    `UPDATE press_releases
     SET title = $3, body_html = $4,
         slug = COALESCE($5, slug),
         seo_description = $6, cover_image_url = $7, status = $8,
         published_at = CASE
           WHEN $8 = 'published' AND published_at IS NULL THEN now()
           WHEN $8 = 'draft' THEN NULL
           ELSE published_at END
     WHERE event_id = $1 AND id = $2
     RETURNING ${COLS}`,
    [
      eventId,
      id,
      input.title,
      input.bodyHtml,
      slug,
      input.seoDescription ?? null,
      input.coverImageUrl ?? null,
      input.status,
    ],
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

export interface SitemapEntry {
  event: {
    id: string;
    name: string;
    customDomain: string | null;
    customDomainVerified: boolean;
    subdomainSlug: string | null;
  };
  slug: string;
  publishedAt: string | null;
}

/** CP publiés de tous les événements + infos de domaine (pour construire les URLs canoniques du sitemap). */
export async function listAllPublishedForSitemap(db: Queryable = pool): Promise<SitemapEntry[]> {
  const { rows } = await db.query<{
    event_id: string;
    name: string;
    custom_domain: string | null;
    custom_domain_verified: boolean;
    subdomain_slug: string | null;
    slug: string;
    published_at: string | null;
  }>(
    `SELECT p.event_id, e.name, e.custom_domain, e.custom_domain_verified, e.subdomain_slug,
            p.slug, p.published_at
     FROM press_releases p
     JOIN events e ON e.id = p.event_id
     WHERE p.status = 'published'
     ORDER BY COALESCE(p.published_at, p.created_at) DESC
     LIMIT 5000`,
  );
  return rows.map((r) => ({
    event: {
      id: r.event_id,
      name: r.name,
      customDomain: r.custom_domain,
      customDomainVerified: r.custom_domain_verified,
      subdomainSlug: r.subdomain_slug,
    },
    slug: r.slug,
    publishedAt: r.published_at,
  }));
}
