import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Double authentification (TOTP) pour les comptes back-office. Le secret TOTP est
  // chiffré au repos (AES-256-GCM, lib/crypto). mfa_enabled passe à true seulement
  // après vérification d'un premier code (preuve que l'app d'authentification est
  // bien configurée).
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN mfa_secret text,
      ADD COLUMN mfa_enabled boolean NOT NULL DEFAULT false;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret, DROP COLUMN IF EXISTS mfa_enabled;');
}
