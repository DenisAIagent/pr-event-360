import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Collaboration équipe sur les demandes :
 * - assigned_to : membre de l'équipe en charge ;
 * - request_notes : fil de notes internes (hors transitions de statut).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_requests_event_assigned
      ON requests(event_id, assigned_to);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS request_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      author_id uuid REFERENCES users(id) ON DELETE SET NULL,
      body text NOT NULL,
      kind text NOT NULL DEFAULT 'note'
        CHECK (kind IN ('note', 'assignment')),
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT request_notes_body_len CHECK (char_length(body) BETWEEN 1 AND 2000)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_request_notes_request
      ON request_notes(request_id, created_at DESC);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS request_notes;');
  pgm.sql('DROP INDEX IF EXISTS idx_requests_event_assigned;');
  pgm.sql('ALTER TABLE requests DROP COLUMN IF EXISTS assigned_to;');
}
