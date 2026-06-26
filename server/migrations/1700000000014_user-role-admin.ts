import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // node-pg-migrate exécute par défaut toutes les migrations dans UNE transaction.
  // Or une nouvelle valeur d'ENUM ne peut pas être utilisée dans la transaction qui
  // l'ajoute. On sort donc cette migration de la transaction pour que « admin » soit
  // committé immédiatement et utilisable par la migration suivante (promotion en 015).
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';`);
}

export async function down(): Promise<void> {
  // PostgreSQL ne permet pas de retirer une valeur d'un type ENUM. On laisse 'admin'
  // en place (inerte si plus aucun compte ne l'utilise). Rollback volontairement no-op.
}
