import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Couleur du texte de la page publique (titre, intro) — indispensable pour
  // rester lisible sur un fond personnalisé foncé.
  pgm.sql('ALTER TABLE event_branding ADD COLUMN text_color text;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE event_branding DROP COLUMN text_color;');
}
