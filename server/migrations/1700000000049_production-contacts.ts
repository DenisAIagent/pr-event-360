import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Espace de validation « production » : un contact externe (prod, management,
 * représentant d'un artiste) reçoit un lien personnel et donne un avis
 * consultatif sur les demandes adressées à SES artistes.
 *
 * - production_contacts : l'identité externe, porteuse du jeton d'accès. Le
 *   jeton est stocké haché uniquement, comme journalists.token_hash (migr. 41).
 * - production_contact_artists : périmètre du contact (un lien peut couvrir
 *   plusieurs artistes).
 * - request_reviews : l'avis. Table séparée de request_notes, dont author_id
 *   référence users(id) : un contact externe n'est pas un utilisateur, et on
 *   ne veut pas affaiblir cette contrainte ni polluer le fil interne.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS production_contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name text NOT NULL,
      email text NOT NULL,
      token_hash text,
      token_expires_at timestamptz,
      last_sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT production_contacts_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
      CONSTRAINT production_contacts_email_len CHECK (char_length(email) BETWEEN 3 AND 320),
      CONSTRAINT production_contacts_email_unique UNIQUE (event_id, email)
    );
  `);
  // Index partiel : un jeton actif identifie un contact et un seul.
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_production_contacts_token_hash
      ON production_contacts(token_hash) WHERE token_hash IS NOT NULL;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_production_contacts_event
      ON production_contacts(event_id, created_at DESC);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS production_contact_artists (
      contact_id uuid NOT NULL REFERENCES production_contacts(id) ON DELETE CASCADE,
      artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      PRIMARY KEY (contact_id, artist_id)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_production_contact_artists_artist
      ON production_contact_artists(artist_id);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS request_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      contact_id uuid REFERENCES production_contacts(id) ON DELETE SET NULL,
      verdict text NOT NULL CHECK (verdict IN ('favorable', 'defavorable')),
      comment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT request_reviews_comment_len CHECK (comment IS NULL OR char_length(comment) <= 2000),
      CONSTRAINT request_reviews_once UNIQUE (request_id, contact_id)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_request_reviews_request
      ON request_reviews(request_id, created_at DESC);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_request_reviews_event
      ON request_reviews(event_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS request_reviews;');
  pgm.sql('DROP TABLE IF EXISTS production_contact_artists;');
  pgm.sql('DROP TABLE IF EXISTS production_contacts;');
}
