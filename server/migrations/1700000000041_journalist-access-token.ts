import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE journalists
      ADD COLUMN IF NOT EXISTS token_hash text,
      ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

    -- Certains environnements ont exécuté une première version de cette migration
    -- sous un ancien numéro. On ne relit la colonne brute que si elle existe encore.
    DO $migration$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'journalists'
           AND column_name = 'token'
      ) THEN
        EXECUTE $sql$
          UPDATE journalists
             SET token_hash = encode(public.digest(token, 'sha256'), 'hex'),
                 token_expires_at = now() + interval '7 days'
           WHERE token IS NOT NULL
        $sql$;
        ALTER TABLE journalists DROP CONSTRAINT IF EXISTS journalists_token_key;
        ALTER TABLE journalists DROP COLUMN token;
      END IF;
    END
    $migration$;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_journalists_token_hash ON journalists(token_hash)
      WHERE token_hash IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_journalists_token_hash;
    ALTER TABLE journalists ADD COLUMN token text;
    ALTER TABLE journalists DROP COLUMN token_hash, DROP COLUMN token_expires_at;
    CREATE UNIQUE INDEX journalists_token_key ON journalists(token) WHERE token IS NOT NULL;
  `);
}
