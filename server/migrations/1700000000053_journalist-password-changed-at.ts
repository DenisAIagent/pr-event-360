import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Révocation des sessions espace journaliste : horodate le dernier changement
 * de mot de passe. Tout JWT typ:jspace émis AVANT cette date est refusé
 * (voir resolveSpaceJournalist) — un reset invalide les sessions ouvertes.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE journalists ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE journalists DROP COLUMN IF EXISTS password_changed_at;`);
}
