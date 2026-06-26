import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Activation/désactivation d'un compte collaborateur (sans suppression).
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;`);

  // Invitations envoyées par un admin. Le compte n'est créé qu'à l'acceptation
  // (définition du mot de passe). On stocke le hash du jeton, jamais le jeton brut.
  // event_ids : événements à assigner automatiquement à l'acceptation.
  pgm.sql(`
    CREATE TABLE invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      role user_role NOT NULL DEFAULT 'attache',
      event_ids uuid[] NOT NULL DEFAULT '{}',
      token_hash text NOT NULL UNIQUE,
      invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_invitations_email ON invitations (email);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS invitations;');
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS active;');
}
