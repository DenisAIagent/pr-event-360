import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Médiathèque de l'événement : photos, vidéos, logos, dossier de presse, autres
  // fichiers. `url` pointe vers le stockage objet (Cloudinary). Téléchargeables
  // depuis la newsroom publique et l'espace journaliste.
  pgm.sql(`
    CREATE TABLE event_assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      kind text NOT NULL DEFAULT 'other',
      title text NOT NULL,
      description text,
      url text NOT NULL,
      thumbnail_url text,
      mime text,
      bytes bigint,
      source text NOT NULL DEFAULT 'upload',
      sort integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_event_assets_event ON event_assets (event_id);
  `);

  // Communiqués de presse (CP). Corps en HTML, publiable/brouillon.
  pgm.sql(`
    CREATE TABLE press_releases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      title text NOT NULL,
      body_html text NOT NULL DEFAULT '',
      published_at timestamptz,
      status text NOT NULL DEFAULT 'draft',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_press_releases_event ON press_releases (event_id);
  `);

  // Newsletters / communications HTML envoyées aux journalistes.
  pgm.sql(`
    CREATE TABLE newsletters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      subject text NOT NULL,
      body_html text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft',
      recipient_count integer NOT NULL DEFAULT 0,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_newsletters_event ON newsletters (event_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS newsletters;');
  pgm.sql('DROP TABLE IF EXISTS press_releases;');
  pgm.sql('DROP TABLE IF EXISTS event_assets;');
}
