import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Sous-domaine self-service sur la plateforme (ex. rockinrio.<PLATFORM_BASE_DOMAIN>).
 * Le client choisit un identifiant (slug) ; un certificat wildcard couvre tous les
 * sous-domaines, donc aucun DNS/TLS par événement. Slug normalisé en minuscules, unique.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE events ADD COLUMN subdomain_slug text UNIQUE;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE events DROP COLUMN IF EXISTS subdomain_slug;');
}
