import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Intégration billetterie par événement :
 * - une connexion (provider + credentials chiffrés + mapping event/tarif externes)
 * - un lien journaliste ↔ participant billetterie (barcode, scan)
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS event_ticketing_connections (
      event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      provider text NOT NULL,
      -- JSON chiffré AES-GCM (credentials provider)
      credentials_encrypted text NOT NULL,
      external_event_id text,
      external_event_name text,
      external_ticket_id text,
      external_ticket_name text,
      -- auto_provision : créer un invité billetterie à l'acceptation d'accréditation
      -- auto_sync_checkin : remonter les scans billetterie vers checked_in_at
      auto_provision boolean NOT NULL DEFAULT true,
      auto_sync_checkin boolean NOT NULL DEFAULT true,
      -- live | sandbox (sandbox = simulation locale sans appel API)
      mode text NOT NULL DEFAULT 'sandbox'
        CHECK (mode IN ('live', 'sandbox')),
      status text NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('disconnected', 'connected', 'error')),
      last_error text,
      last_sync_at timestamptz,
      last_test_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS journalist_ticketing_links (
      journalist_id uuid PRIMARY KEY REFERENCES journalists(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      provider text NOT NULL,
      external_participant_id text,
      barcode text,
      external_status text,
      last_scanned_at timestamptz,
      provisioned_at timestamptz NOT NULL DEFAULT now(),
      last_sync_at timestamptz,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE INDEX IF NOT EXISTS idx_jtl_event ON journalist_ticketing_links(event_id);
    CREATE INDEX IF NOT EXISTS idx_jtl_barcode ON journalist_ticketing_links(barcode)
      WHERE barcode IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_jtl_external
      ON journalist_ticketing_links(provider, external_participant_id)
      WHERE external_participant_id IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS journalist_ticketing_links;
    DROP TABLE IF EXISTS event_ticketing_connections;
  `);
}
