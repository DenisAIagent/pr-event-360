import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * « Continuer avec Google » : un compte peut désormais être lié à un identifiant Google
 * et ne pas avoir de mot de passe. `google_id` (sub Google) est unique ; `auth_provider`
 * distingue les comptes mot de passe des comptes Google.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ADD COLUMN google_id text UNIQUE;
    ALTER TABLE users ADD COLUMN auth_provider text NOT NULL DEFAULT 'password';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
    ALTER TABLE users DROP COLUMN IF EXISTS google_id;
    -- On ne remet pas NOT NULL sur password_hash (des comptes Google peuvent exister).
  `);
}
