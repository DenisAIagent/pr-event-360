import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Multi-locataire : chaque client = une organisation isolée. On rattache users,
 * events et invitations à une organisation. Backfill : tout l'existant va dans une
 * organisation par défaut « MDMC », et le compte propriétaire devient super-admin
 * plateforme (is_platform_admin) — le seul à gérer les intégrations partagées.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text UNIQUE NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO organizations (name, slug) VALUES ('MDMC', 'mdmc');

    -- Colonnes (nullable le temps du backfill).
    ALTER TABLE users ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT;
    ALTER TABLE users ADD COLUMN is_platform_admin boolean NOT NULL DEFAULT false;
    ALTER TABLE events ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT;
    ALTER TABLE invitations ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

    -- Backfill vers l'organisation par défaut.
    UPDATE users SET organization_id = (SELECT id FROM organizations WHERE slug = 'mdmc') WHERE organization_id IS NULL;
    UPDATE events SET organization_id = (SELECT id FROM organizations WHERE slug = 'mdmc') WHERE organization_id IS NULL;
    UPDATE invitations SET organization_id = (SELECT id FROM organizations WHERE slug = 'mdmc') WHERE organization_id IS NULL;

    -- Verrouillage NOT NULL après backfill.
    ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE events ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE invitations ALTER COLUMN organization_id SET NOT NULL;

    -- Super-admin plateforme = compte propriétaire historique.
    UPDATE users SET is_platform_admin = true WHERE email = 'denis@mdmcmusicads.com';

    CREATE INDEX idx_users_org ON users (organization_id);
    CREATE INDEX idx_events_org ON events (organization_id);
    CREATE INDEX idx_invitations_org ON invitations (organization_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE invitations DROP COLUMN IF EXISTS organization_id;
    ALTER TABLE events DROP COLUMN IF EXISTS organization_id;
    ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
    ALTER TABLE users DROP COLUMN IF EXISTS is_platform_admin;
    DROP TABLE IF EXISTS organizations;
  `);
}
