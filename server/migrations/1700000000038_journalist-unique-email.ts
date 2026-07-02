import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Anti-doublon accréditation au niveau BASE : une seule demande par (événement, email).
 * Le contrôle applicatif (existsJournalistByEventEmail) laisse une fenêtre de course
 * entre deux soumissions concurrentes ; l'index unique la ferme définitivement.
 *
 * Casse : indexe lower(email) — miroir exact du contrôle applicatif (lower(email)).
 * Si des doublons pré-existants bloquaient la création, c'est un vrai problème de
 * données à trancher à la main (aucune suppression automatique ici — pas de perte).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    `CREATE UNIQUE INDEX uniq_journalists_event_email ON journalists (event_id, lower(email));`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP INDEX IF EXISTS uniq_journalists_event_email;');
}
