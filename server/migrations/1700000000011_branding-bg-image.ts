import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Image de fond de la page publique (URL hébergée ou data URL).
  pgm.sql('ALTER TABLE event_branding ADD COLUMN bg_image_url text;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE event_branding DROP COLUMN bg_image_url;');
}
