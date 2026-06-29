import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

const DEFAULT_PHOTO_TERMS =
  "En tant que journaliste accrédité·e, vous êtes autorisé·e à réaliser et utiliser les photos/vidéos uniquement dans le cadre de la publication pour laquelle vous êtes accrédité·e. Vous vous engagez à créditer l'artiste et l'événement lors de toute exploitation (presse, web et réseaux sociaux). Toute autre utilisation — commerciale, revente ou cession à un tiers — est interdite sans autorisation écrite préalable. Les consignes de prise de vue communiquées par la production (durée, emplacement, nombre de titres) doivent être strictement respectées.";

/**
 * Règles photo & autorisations par événement : la règle de prise de vue, l'indication
 * « contrat à signer sur place », et le texte d'autorisation (pré-rempli, éditable par le RP).
 * Ce texte est joint à l'email d'acceptation des reportages via la variable {{reportage}}
 * (ajoutée aux templates request_accepted déjà stockés).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE event_configs
      ADD COLUMN photo_rule text,
      ADD COLUMN onsite_contract boolean NOT NULL DEFAULT false,
      ADD COLUMN photo_terms text;
  `);
  pgm.sql(`UPDATE event_configs SET photo_terms = $$${DEFAULT_PHOTO_TERMS}$$ WHERE photo_terms IS NULL`);
  pgm.sql(`
    UPDATE email_templates SET body = body || '{{reportage}}'
    WHERE trigger_key = 'request_accepted' AND channel = 'email' AND body NOT LIKE '%{{reportage}}%';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE event_configs
      DROP COLUMN IF EXISTS photo_terms,
      DROP COLUMN IF EXISTS onsite_contract,
      DROP COLUMN IF EXISTS photo_rule;
  `);
}
