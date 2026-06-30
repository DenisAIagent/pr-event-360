import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * SEO des communiqués : chaque CP reçoit un slug (URL propre), une description SEO et une image
 * de couverture (Open Graph). Back-fill du slug depuis le titre des CP existants (unicité par event),
 * puis index unique (event_id, slug).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE press_releases
      ADD COLUMN slug text,
      ADD COLUMN seo_description text,
      ADD COLUMN cover_image_url text;
  `);

  // Slug de base depuis le titre (minuscules, alphanum → tirets). Les accents tombent en tiret (ok pour le back-fill).
  pgm.sql(`
    UPDATE press_releases
    SET slug = NULLIF(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '');
  `);
  pgm.sql(`UPDATE press_releases SET slug = 'cp' WHERE slug IS NULL OR slug = '';`);

  // Déduplication par événement : on suffixe -2, -3… les doublons (ordre de création).
  pgm.sql(`
    WITH ranked AS (
      SELECT id, slug,
             row_number() OVER (PARTITION BY event_id, slug ORDER BY created_at) AS rn
      FROM press_releases
    )
    UPDATE press_releases p
    SET slug = p.slug || '-' || ranked.rn
    FROM ranked
    WHERE p.id = ranked.id AND ranked.rn > 1;
  `);

  pgm.sql(`CREATE UNIQUE INDEX idx_press_releases_event_slug ON press_releases(event_id, slug);`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_press_releases_event_slug;`);
  pgm.sql(`
    ALTER TABLE press_releases
      DROP COLUMN IF EXISTS cover_image_url,
      DROP COLUMN IF EXISTS seo_description,
      DROP COLUMN IF EXISTS slug;
  `);
}
