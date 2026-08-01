import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Alertes sur les avis production :
 *
 * - production_digest_state : borne du dernier récapitulatif quotidien envoyé
 *   pour un événement. Table dédiée plutôt qu'une colonne sur event_recap, qui
 *   porte la configuration d'un tout autre récapitulatif (les inscriptions) avec
 *   sa propre fréquence — les mélanger rendrait les deux illisibles.
 *
 * - review_seen_marks : ce que chaque membre a déjà consulté, pour le compteur
 *   d'avis nouveaux dans le back-office. Un marqueur par couple utilisateur +
 *   événement : deux attachés sur le même événement ont chacun leur compteur.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS production_digest_state (
      event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      last_sent_at timestamptz
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS review_seen_marks (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      seen_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, event_id)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS review_seen_marks;');
  pgm.sql('DROP TABLE IF EXISTS production_digest_state;');
}
