import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Jetons de réinitialisation de mot de passe pour les journalistes (espace public).
 * Même schéma que `password_reset_tokens` (back-office) : on ne stocke que le hash
 * SHA-256 du jeton (entropie 256 bits → non réversible), usage unique (used_at) +
 * expiration courte (expires_at). Suppression en cascade avec le journaliste (RGPD).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE journalist_password_resets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      journalist_id uuid NOT NULL REFERENCES journalists(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_journalist_password_resets_hash ON journalist_password_resets (token_hash);
    CREATE INDEX idx_journalist_password_resets_journalist ON journalist_password_resets (journalist_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS journalist_password_resets;');
}
