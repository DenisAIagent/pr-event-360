import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Journalistes. token = lien tokenisé non devinable, généré à l'acceptation (NULL avant).
  // RGPD : consentement explicite OBLIGATOIRE à la création (CHECK), horodaté.
  pgm.sql(`
    CREATE TABLE journalists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      token text UNIQUE,
      first_name text NOT NULL,
      last_name text,
      email text NOT NULL,
      phone text,
      media text,
      media_type_id uuid REFERENCES media_types(id) ON DELETE SET NULL,
      audience text,
      prev_article text,
      lang lang_code NOT NULL DEFAULT 'fr',
      accreditation_type accreditation_type,
      acc_status accreditation_status NOT NULL DEFAULT 'pas_encore_traite',
      commit_publish boolean NOT NULL DEFAULT false,
      consent boolean NOT NULL DEFAULT false,
      consent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT consent_required CHECK (consent = true)
    );
  `);

  pgm.sql('CREATE INDEX idx_journalists_event ON journalists(event_id);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS journalists;');
}
