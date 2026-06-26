import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Demandes. Cohérence métier garantie par CHECK :
  //   interview ⇒ artist_id requis ; reportage photo/vidéo ⇒ stage_id requis.
  pgm.sql(`
    CREATE TABLE requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      journalist_id uuid NOT NULL REFERENCES journalists(id) ON DELETE CASCADE,
      type request_type NOT NULL,
      artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
      slot_id uuid REFERENCES interview_slots(id) ON DELETE SET NULL,
      stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
      message text,
      status request_status NOT NULL DEFAULT 'pas_encore_traite',
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT request_target_coherence CHECK (
        (type = 'interview' AND artist_id IS NOT NULL)
        OR (type IN ('photo_report','video_report') AND stage_id IS NOT NULL)
      )
    );
  `);

  // La file du back-office est triée/filtrée par (event, statut) → index dédié.
  pgm.sql('CREATE INDEX idx_requests_event_status ON requests(event_id, status);');
  pgm.sql('CREATE INDEX idx_requests_artist ON requests(artist_id);');
  pgm.sql('CREATE INDEX idx_requests_stage ON requests(stage_id);');
  pgm.sql('CREATE INDEX idx_requests_journalist ON requests(journalist_id);');

  // Historique horodaté des changements de statut (traçabilité complète).
  // changed_by NULL = transition déclenchée par le système (ex. mise en liste d'attente).
  pgm.sql(`
    CREATE TABLE request_status_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      status request_status NOT NULL,
      changed_at timestamptz NOT NULL DEFAULT now(),
      changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      note text
    );
  `);

  pgm.sql('CREATE INDEX idx_history_request ON request_status_history(request_id, changed_at);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS request_status_history;');
  pgm.sql('DROP TABLE IF EXISTS requests;');
}
