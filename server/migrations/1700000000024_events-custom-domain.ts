import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Domaine personnalisé par événement (white-label). Chaque festival peut servir ses
 * surfaces publiques sous son propre nom de domaine (ex. presse.festival-x.com).
 * Le domaine est normalisé en minuscules et unique ; `verified` reflète la résolution DNS.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events
      ADD COLUMN custom_domain text UNIQUE,
      ADD COLUMN custom_domain_verified boolean NOT NULL DEFAULT false;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events
      DROP COLUMN IF EXISTS custom_domain,
      DROP COLUMN IF EXISTS custom_domain_verified;
  `);
}
