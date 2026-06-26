import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Scènes de l'événement.
  pgm.sql(`
    CREATE TABLE stages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name text NOT NULL,
      UNIQUE (event_id, name)
    );
  `);

  // Lineup : itw_quota NULL ⇒ on retombe sur le quota par défaut de l'événement.
  pgm.sql(`
    CREATE TABLE artists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name text NOT NULL,
      stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
      itw_quota int,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Tranches de disponibilité saisies par l'attaché (jour + heures).
  pgm.sql(`
    CREATE TABLE artist_windows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      day date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      CHECK (end_time > start_time)
    );
  `);

  // Créneaux d'interview GÉNÉRÉS automatiquement (durée + buffer).
  // Même représentation jour/heure que les fenêtres → pas de piège de fuseau horaire au MVP.
  pgm.sql(`
    CREATE TABLE interview_slots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      window_id uuid NOT NULL REFERENCES artist_windows(id) ON DELETE CASCADE,
      day date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      UNIQUE (artist_id, day, start_time)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS interview_slots;');
  pgm.sql('DROP TABLE IF EXISTS artist_windows;');
  pgm.sql('DROP TABLE IF EXISTS artists;');
  pgm.sql('DROP TABLE IF EXISTS stages;');
}
