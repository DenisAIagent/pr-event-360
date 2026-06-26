import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Journal des notifications. En mode simulation, chaque message est PERSISTÉ ici
  // (jamais envoyé) pour être visualisé dans le back-office avant de brancher Brevo/Twilio.
  pgm.sql(`
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      journalist_id uuid REFERENCES journalists(id) ON DELETE SET NULL,
      channel text NOT NULL CHECK (channel IN ('email','sms')),
      trigger_key text NOT NULL,
      lang lang_code NOT NULL,
      to_address text NOT NULL,
      subject text,
      body text NOT NULL,
      provider text NOT NULL DEFAULT 'simulation',
      status text NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated','sent','failed')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql('CREATE INDEX idx_notifications_event ON notifications(event_id, created_at);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS notifications;');
}
