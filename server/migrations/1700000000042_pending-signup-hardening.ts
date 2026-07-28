import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- L'identité email est activée après paiement via un token envoyé par email :
    -- aucun hash choisi avant cette preuve ne doit subsister.
    ALTER TABLE pending_signups DROP COLUMN IF EXISTS password_hash;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_signups_unique_session
      ON pending_signups(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_pending_signups_unique_session;
    ALTER TABLE pending_signups ADD COLUMN password_hash text;
  `);
}
