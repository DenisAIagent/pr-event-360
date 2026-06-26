import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Réglages d'intégration (clés API des outils externes) gérés par l'admin via l'UI.
  // Les valeurs sont CHIFFRÉES (AES-256-GCM) avant stockage : la base ne contient
  // jamais de secret en clair. Une ligne par clé logique (ex. BREVO_API_KEY).
  pgm.sql(`
    CREATE TABLE app_secrets (
      key text PRIMARY KEY,
      value_encrypted text NOT NULL,
      updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS app_secrets;');
}
