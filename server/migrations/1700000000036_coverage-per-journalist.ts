import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Le délai de publication est choisi par le journaliste à l'inscription (3, 8 ou 30 jours).
 * L'email de collecte des retombées est envoyé à `fin de l'événement + délai`, par journaliste
 * (idempotence au niveau journaliste). On remplace l'ancien envoi unique par événement (J+3 fixe).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE journalists
      ADD COLUMN publish_delay_days integer NOT NULL DEFAULT 8,
      ADD COLUMN coverage_request_sent_at timestamptz;
    ALTER TABLE events DROP COLUMN IF EXISTS coverage_request_sent_at;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events ADD COLUMN coverage_request_sent_at timestamptz;
    ALTER TABLE journalists
      DROP COLUMN IF EXISTS coverage_request_sent_at,
      DROP COLUMN IF EXISTS publish_delay_days;
  `);
}
