import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Revue de presse : retombées médiatiques déposées par les journalistes accrédités après
 * l'événement (liens d'articles/réseaux/YouTube, photos, liens vidéo, captures). Classées
 * par catégorie de média. Pour tout média uploadé, l'autorisation d'archivage et d'usage
 * promotionnel est requise (consentement horodaté).
 * `events.coverage_request_sent_at` : idempotence de l'email automatique J+3.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE press_coverage (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      journalist_id uuid NOT NULL REFERENCES journalists(id) ON DELETE CASCADE,
      media_category text NOT NULL,
      is_upload boolean NOT NULL DEFAULT false,
      url text NOT NULL,
      thumbnail_url text,
      title text,
      archive_consent boolean NOT NULL DEFAULT false,
      promo_consent boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_press_coverage_event ON press_coverage (event_id);
    CREATE INDEX idx_press_coverage_journalist ON press_coverage (journalist_id);

    ALTER TABLE events ADD COLUMN coverage_request_sent_at timestamptz;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events DROP COLUMN IF EXISTS coverage_request_sent_at;
    DROP TABLE IF EXISTS press_coverage;
  `);
}
