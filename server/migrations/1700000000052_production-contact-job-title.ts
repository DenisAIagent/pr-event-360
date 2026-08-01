import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/** Fonction / poste du contact production (manager, attaché prod, etc.). */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE production_contacts
      ADD COLUMN IF NOT EXISTS job_title text;

    ALTER TABLE production_contacts
      DROP CONSTRAINT IF EXISTS production_contacts_job_title_len;

    ALTER TABLE production_contacts
      ADD CONSTRAINT production_contacts_job_title_len
      CHECK (job_title IS NULL OR char_length(job_title) BETWEEN 1 AND 200);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE production_contacts DROP CONSTRAINT IF EXISTS production_contacts_job_title_len;
    ALTER TABLE production_contacts DROP COLUMN IF EXISTS job_title;
  `);
}
