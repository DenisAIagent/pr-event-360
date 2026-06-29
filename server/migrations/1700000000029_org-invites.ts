import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Invitation à s'inscrire (onboarding offert par le super-admin) : on invite un EMAIL,
 * l'organisation n'existe pas encore — l'invité la crée lui-même en acceptant. Distinct
 * de `invitations` (qui rattache à une organisation existante).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE org_invites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_org_invites_email ON org_invites (email);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS org_invites;');
}
