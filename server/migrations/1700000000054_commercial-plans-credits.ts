import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Offres commerciales : crédits événement par organisation, quotas de stockage
 * par événement, option Média Plus, plan commercial et ledger d'achats.
 *
 * - event_credits_balance NULL = illimité (legacy / comped / bootstrap)
 * - event_credits_balance >= 0 = licences restantes à consommer à la création
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS commercial_plan text NOT NULL DEFAULT 'legacy',
      ADD COLUMN IF NOT EXISTS event_credits_balance integer,
      ADD COLUMN IF NOT EXISTS event_credits_expire_at timestamptz,
      ADD COLUMN IF NOT EXISTS billing_source text NOT NULL DEFAULT 'unknown';

    -- Orgs existantes : illimitées (grandfather), source inconnue ou déjà actives.
    UPDATE organizations
       SET commercial_plan = 'legacy',
           event_credits_balance = NULL,
           billing_source = CASE
             WHEN stripe_subscription_id IS NOT NULL AND stripe_subscription_id <> '' THEN 'stripe'
             ELSE 'legacy'
           END
     WHERE commercial_plan = 'legacy';

    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS storage_quota_bytes bigint NOT NULL DEFAULT 21474836480,
      ADD COLUMN IF NOT EXISTS media_plus boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS credit_consumed boolean NOT NULL DEFAULT true;

    ALTER TABLE pending_signups
      ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'event';

    CREATE TABLE IF NOT EXISTS billing_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
      plan_code text NOT NULL,
      credits_delta integer NOT NULL DEFAULT 0,
      stripe_session_id text,
      stripe_payment_intent text,
      event_id uuid REFERENCES events(id) ON DELETE SET NULL,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_billing_ledger_org ON billing_ledger (organization_id, created_at DESC);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS billing_ledger;
    ALTER TABLE pending_signups DROP COLUMN IF EXISTS plan_code;
    ALTER TABLE events
      DROP COLUMN IF EXISTS credit_consumed,
      DROP COLUMN IF EXISTS media_plus,
      DROP COLUMN IF EXISTS storage_quota_bytes;
    ALTER TABLE organizations
      DROP COLUMN IF EXISTS billing_source,
      DROP COLUMN IF EXISTS event_credits_expire_at,
      DROP COLUMN IF EXISTS event_credits_balance,
      DROP COLUMN IF EXISTS commercial_plan;
  `);
}
