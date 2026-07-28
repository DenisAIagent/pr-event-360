import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Anti-rejeu TOTP : un code reste valide ~90 s (fenêtre ±1). Un code intercepté
  // (épaule, proxy, historique de presse-papier) pouvait donc être rejoué dans cet
  // intervalle. On mémorise le dernier compteur de fenêtre consommé par compte ;
  // toute vérification ultérieure exige un compteur STRICTEMENT supérieur.
  pgm.sql('ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_counter bigint;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS mfa_last_counter;');
}
