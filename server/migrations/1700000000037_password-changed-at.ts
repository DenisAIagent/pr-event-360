import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Révocation des sessions : horodate le dernier changement de mot de passe.
 * Tout JWT émis AVANT cette date est considéré révoqué (voir requireAuth) → un reset
 * de mot de passe invalide immédiatement les sessions ouvertes avec l'ancien.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE users ADD COLUMN password_changed_at timestamptz;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;`);
}
