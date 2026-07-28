import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Anti-doublon accréditation au niveau BASE : une seule demande par (événement, email).
 * Le contrôle applicatif (existsJournalistByEventEmail) laisse une fenêtre de course
 * entre deux soumissions concurrentes ; l'index unique la ferme définitivement.
 *
 * Les éventuels doublons historiques sont conservés sans perte : une seule ligne
 * par groupe reste dans le périmètre de l'index, les autres sont marquées comme
 * historiques. Toutes les nouvelles lignes ont `dedup_enforced = true` par défaut,
 * donc deux soumissions concurrentes restent strictement impossibles.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE journalists
      ADD COLUMN dedup_enforced boolean NOT NULL DEFAULT true;

    WITH ranked AS (
      SELECT id,
             row_number() OVER (
               PARTITION BY event_id, lower(email)
               ORDER BY
                 (password_hash IS NOT NULL) DESC,
                 (token IS NOT NULL) DESC,
                 (acc_status = 'acceptee') DESC,
                 created_at DESC,
                 id
             ) AS position
        FROM journalists
    )
    UPDATE journalists j
       SET dedup_enforced = false
      FROM ranked r
     WHERE j.id = r.id AND r.position > 1;

    CREATE UNIQUE INDEX uniq_journalists_event_email
      ON journalists (event_id, lower(email))
      WHERE dedup_enforced;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS uniq_journalists_event_email;
    ALTER TABLE journalists DROP COLUMN IF EXISTS dedup_enforced;
  `);
}
