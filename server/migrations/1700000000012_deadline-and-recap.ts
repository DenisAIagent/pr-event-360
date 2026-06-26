import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Date/heure de clôture des inscriptions (accréditations). NULL = pas de limite.
  pgm.sql('ALTER TABLE events ADD COLUMN accreditation_deadline timestamptz;');

  // Configuration du récapitulatif périodique des inscriptions, par événement.
  // recipients = emails de l'équipe presse (pas besoin de comptes utilisateurs).
  pgm.sql(`
    CREATE TABLE event_recap (
      event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      frequency text NOT NULL DEFAULT 'none' CHECK (frequency IN ('none','daily','weekly')),
      recipients text[] NOT NULL DEFAULT '{}',
      last_sent_at timestamptz
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS event_recap;');
  pgm.sql('ALTER TABLE events DROP COLUMN IF EXISTS accreditation_deadline;');
}
