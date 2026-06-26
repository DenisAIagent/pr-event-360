import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Événement = entité racine. Tout descend de event_id (isolation inter-festivals).
  pgm.sql(`
    CREATE TABLE events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      name text NOT NULL,
      location text,
      start_date date,
      end_date date,
      languages lang_code[] NOT NULL DEFAULT '{fr}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Configuration 1:1 : durées, quotas par défaut, paramètres du bonus d'ancienneté.
  pgm.sql(`
    CREATE TABLE event_configs (
      event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      itw_duration_min int NOT NULL DEFAULT 15 CHECK (itw_duration_min > 0),
      itw_buffer_min int NOT NULL DEFAULT 5 CHECK (itw_buffer_min >= 0),
      default_itw_quota int NOT NULL DEFAULT 3 CHECK (default_itw_quota >= 0),
      photo_quota_per_stage int NOT NULL DEFAULT 5 CHECK (photo_quota_per_stage >= 0),
      age_bonus_per_hour numeric NOT NULL DEFAULT 1,
      age_bonus_cap numeric NOT NULL DEFAULT 24
    );
  `);

  // Poids de priorité par type de média (éditable par événement).
  pgm.sql(`
    CREATE TABLE media_types (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      label text NOT NULL,
      weight int NOT NULL DEFAULT 0,
      UNIQUE (event_id, label)
    );
  `);

  // Multiplicateur de priorité par type de demande (éditable par événement).
  pgm.sql(`
    CREATE TABLE request_type_weights (
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      type request_type NOT NULL,
      multiplier numeric NOT NULL DEFAULT 1.0,
      PRIMARY KEY (event_id, type)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS request_type_weights;');
  pgm.sql('DROP TABLE IF EXISTS media_types;');
  pgm.sql('DROP TABLE IF EXISTS event_configs;');
  pgm.sql('DROP TABLE IF EXISTS events;');
}
