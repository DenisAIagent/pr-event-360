import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'music';
    DO $migration$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_event_type_check'
          AND conrelid = 'events'::regclass
      ) THEN
        ALTER TABLE events ADD CONSTRAINT events_event_type_check
          CHECK (event_type IN ('music', 'trade_show', 'conference', 'corporate', 'other'));
      END IF;
    END
    $migration$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
    ALTER TABLE events DROP COLUMN IF EXISTS event_type;
  `);
}
