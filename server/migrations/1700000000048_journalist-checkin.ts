import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Check-in d'arrivée (Jour J) : horodatage de présence à l'entrée presse,
 * distinct du check-in conférences de presse.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE journalists
      ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_journalists_event_checked_in
      ON journalists(event_id, checked_in_at)
      WHERE checked_in_at IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP INDEX IF EXISTS idx_journalists_event_checked_in;');
  pgm.sql('ALTER TABLE journalists DROP COLUMN IF EXISTS checked_in_at;');
}
