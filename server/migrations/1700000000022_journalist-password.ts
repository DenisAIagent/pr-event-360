import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Compte journaliste (email + mot de passe) pour l'espace.
 * Le journaliste peut, après acceptation, définir un mot de passe depuis son espace
 * et se reconnecter ensuite par email + mot de passe (le lien magique reste valable).
 * NULL ⇒ aucun mot de passe défini (accès uniquement par lien magique).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE journalists ADD COLUMN password_hash text;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE journalists DROP COLUMN IF EXISTS password_hash;');
}
