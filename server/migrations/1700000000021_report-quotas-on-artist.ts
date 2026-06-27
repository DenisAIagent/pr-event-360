import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Les reportages photo/vidéo ciblent désormais un ARTISTE (et non plus une scène) :
 * c'est l'artiste qui fixe ses quotas (interviews, photographes, vidéastes).
 * - Quotas photo/vidéo déplacés des scènes vers les artistes (NULL ⇒ illimité, pas de défaut).
 * - La contrainte de cohérence exige un artist_id pour les 3 types de demande.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Quotas reportage déplacés sur l'artiste, retirés des scènes.
  pgm.sql(`
    ALTER TABLE artists
      ADD COLUMN photo_quota int CHECK (photo_quota >= 0),
      ADD COLUMN video_quota int CHECK (video_quota >= 0);
  `);
  pgm.sql('ALTER TABLE stages DROP COLUMN IF EXISTS photo_quota, DROP COLUMN IF EXISTS video_quota;');

  // 2. Les reportages doivent cibler un artiste. Les anciens reportages basés
  //    sur une scène (sans artist_id) ne sont pas auto-migrables (une scène a
  //    plusieurs artistes) : on les supprime.
  pgm.sql(`DELETE FROM requests WHERE type IN ('photo_report','video_report') AND artist_id IS NULL;`);
  pgm.sql('ALTER TABLE requests DROP CONSTRAINT IF EXISTS request_target_coherence;');
  pgm.sql(`
    ALTER TABLE requests
      ADD CONSTRAINT request_target_coherence CHECK (artist_id IS NOT NULL);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE requests DROP CONSTRAINT IF EXISTS request_target_coherence;');
  pgm.sql(`
    ALTER TABLE requests
      ADD CONSTRAINT request_target_coherence CHECK (
        (type = 'interview' AND artist_id IS NOT NULL)
        OR (type IN ('photo_report','video_report') AND stage_id IS NOT NULL)
      );
  `);
  pgm.sql(`
    ALTER TABLE stages
      ADD COLUMN photo_quota int CHECK (photo_quota >= 0),
      ADD COLUMN video_quota int CHECK (video_quota >= 0);
  `);
  pgm.sql('ALTER TABLE artists DROP COLUMN IF EXISTS photo_quota, DROP COLUMN IF EXISTS video_quota;');
}
