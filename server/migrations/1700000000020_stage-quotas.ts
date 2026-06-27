import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Quotas de reportage par scène (comme itw_quota par artiste pour les interviews).
  // NULL ⇒ pour la photo on retombe sur le quota par défaut de l'événement
  // (photo_quota_per_stage) ; pour la vidéo, NULL ⇒ illimité (comportement actuel).
  pgm.sql(`
    ALTER TABLE stages
      ADD COLUMN photo_quota int CHECK (photo_quota >= 0),
      ADD COLUMN video_quota int CHECK (video_quota >= 0);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE stages DROP COLUMN IF EXISTS photo_quota, DROP COLUMN IF EXISTS video_quota;');
}
