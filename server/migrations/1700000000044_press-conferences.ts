import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TYPE press_conference_status AS ENUM ('draft', 'published', 'closed', 'completed');
    CREATE TYPE press_conference_registration_mode AS ENUM ('open', 'approval', 'invite_only');
    CREATE TYPE press_conference_registration_status AS ENUM (
      'invited', 'pending', 'registered', 'waitlisted', 'declined', 'checked_in', 'cancelled'
    );

    CREATE TABLE press_conferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz,
      venue text,
      capacity int CHECK (capacity IS NULL OR capacity >= 0),
      registration_mode press_conference_registration_mode NOT NULL DEFAULT 'open',
      status press_conference_status NOT NULL DEFAULT 'draft',
      allowed_accreditation_types accreditation_type[] NOT NULL DEFAULT '{presse,photo,video}',
      embargo_until timestamptz,
      livestream_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (ends_at IS NULL OR ends_at > starts_at)
    );

    CREATE TABLE press_conference_participants (
      conference_id uuid NOT NULL REFERENCES press_conferences(id) ON DELETE CASCADE,
      artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      PRIMARY KEY (conference_id, artist_id)
    );

    CREATE TABLE press_conference_registrations (
      conference_id uuid NOT NULL REFERENCES press_conferences(id) ON DELETE CASCADE,
      journalist_id uuid NOT NULL REFERENCES journalists(id) ON DELETE CASCADE,
      status press_conference_registration_status NOT NULL,
      source_request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (conference_id, journalist_id)
    );

    CREATE INDEX idx_press_conferences_event_start
      ON press_conferences(event_id, starts_at);
    CREATE INDEX idx_press_conference_registrations_status
      ON press_conference_registrations(conference_id, status);
    CREATE INDEX idx_press_conference_registrations_journalist
      ON press_conference_registrations(journalist_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS press_conference_registrations;
    DROP TABLE IF EXISTS press_conference_participants;
    DROP TABLE IF EXISTS press_conferences;
    DROP TYPE IF EXISTS press_conference_registration_status;
    DROP TYPE IF EXISTS press_conference_registration_mode;
    DROP TYPE IF EXISTS press_conference_status;
  `);
}
