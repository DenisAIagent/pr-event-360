import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Journal d'audit (RGPD art. 5.2 « responsabilité » et art. 32 : traçabilité des accès
  // aux données personnelles). Consigne QUI a fait QUOI, QUAND et DEPUIS OÙ sur les
  // surfaces d'administration. Ne contient JAMAIS de corps de requête : uniquement le
  // motif de route paramétré et les identifiants de ressources — pas de mot de passe,
  // pas de jeton, pas de contenu de fiche.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      occurred_at      timestamptz NOT NULL DEFAULT now(),
      actor_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
      actor_email      text        NOT NULL,
      actor_role       text        NOT NULL,
      organization_id  uuid,
      method           text        NOT NULL,
      route            text        NOT NULL,
      resource_params  jsonb       NOT NULL DEFAULT '{}'::jsonb,
      status_code      integer     NOT NULL,
      ip               text,
      user_agent       text
    );
  `);

  // Lectures attendues : « tout ce qu'a fait ce compte », « tout ce qui s'est passé
  // dans cette organisation », les deux toujours par ordre chronologique inverse.
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx ON audit_log (occurred_at DESC);');
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log (organization_id, occurred_at DESC);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_user_id, occurred_at DESC);',
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS audit_log;');
}
