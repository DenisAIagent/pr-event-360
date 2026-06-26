import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Assignation des collaborateurs aux événements. L'admin a accès à TOUT sans ligne
  // ici ; les autres rôles n'accèdent qu'aux événements où ils sont membres.
  pgm.sql(`
    CREATE TABLE event_members (
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (event_id, user_id)
    );
    CREATE INDEX idx_event_members_user ON event_members (user_id);
  `);

  // Backfill : chaque propriétaire existant devient membre de ses propres événements,
  // pour ne pas perdre l'accès après le passage au modèle par appartenance.
  pgm.sql(`
    INSERT INTO event_members (event_id, user_id)
    SELECT id, owner_user_id FROM events
    ON CONFLICT DO NOTHING;
  `);

  // Bootstrap du premier admin : le compte propriétaire historique. Idempotent.
  pgm.sql(`UPDATE users SET role = 'admin' WHERE email = 'denis@mdmcmusicads.com';`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS event_members;');
}
