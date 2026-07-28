import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Un ré-enrôlement prépare un nouveau secret sans désactiver/remplacer le secret
  // actuellement valide. Il n'est promu qu'après preuve TOTP.
  pgm.sql('ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_pending_secret text;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS mfa_pending_secret;');
}
