import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Templates éditables par l'attaché : un par (événement, langue, déclencheur, canal).
  // trigger_key ex. : accreditation_received | accreditation_accepted | accreditation_rejected
  //                   request_received | request_accepted | request_rejected
  // body contient des variables substituées à l'envoi (ex. {{firstName}}, {{artist}}, {{slot}}).
  pgm.sql(`
    CREATE TABLE email_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      lang lang_code NOT NULL,
      trigger_key text NOT NULL,
      channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
      subject text,
      body text NOT NULL,
      UNIQUE (event_id, lang, trigger_key, channel)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS email_templates;');
}
