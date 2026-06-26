import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Personnalisation visuelle des pages publiques, propre à chaque événement.
  // logo_url accepte une URL hébergée OU une data URL (logo encodé en base64),
  // ce qui évite toute infrastructure de stockage de fichiers pour le MVP.
  pgm.sql(`
    CREATE TABLE event_branding (
      event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      logo_url text,
      accent_color text,
      bg_color text
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS event_branding;');
}
