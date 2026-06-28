import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Inscription payante (Stripe) : un abonnement par organisation. `pending_signups` retient
 * l'intention d'inscription le temps du paiement ; le compte n'est créé qu'au webhook de
 * paiement validé. Les organisations existantes sont marquées `active` (jamais bloquées).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE pending_signups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      org_name text NOT NULL,
      full_name text NOT NULL,
      password_hash text,
      google_id text,
      auth_provider text NOT NULL DEFAULT 'password',
      stripe_session_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX idx_pending_signups_session ON pending_signups (stripe_session_id);
    CREATE INDEX idx_pending_signups_email ON pending_signups (email);

    ALTER TABLE organizations
      ADD COLUMN stripe_customer_id text,
      ADD COLUMN stripe_subscription_id text,
      ADD COLUMN subscription_status text NOT NULL DEFAULT 'active',
      ADD COLUMN current_period_end timestamptz;
    CREATE INDEX idx_orgs_stripe_sub ON organizations (stripe_subscription_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE organizations
      DROP COLUMN IF EXISTS current_period_end,
      DROP COLUMN IF EXISTS subscription_status,
      DROP COLUMN IF EXISTS stripe_subscription_id,
      DROP COLUMN IF EXISTS stripe_customer_id;
    DROP TABLE IF EXISTS pending_signups;
  `);
}
