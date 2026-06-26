import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Jetons de réinitialisation de mot de passe (back-office). On ne stocke JAMAIS
  // le jeton en clair : seul son hash SHA-256 est conservé. Le jeton a une entropie
  // de 256 bits (aléatoire), un hash sans sel est donc suffisant et non réversible.
  // Usage unique (used_at) + expiration courte (expires_at). Suppression en cascade
  // si le compte est supprimé (droit à l'effacement).
  pgm.sql(`
    CREATE TABLE password_reset_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
    CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS password_reset_tokens;');
}
