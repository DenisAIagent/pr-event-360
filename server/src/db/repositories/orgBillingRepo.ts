import { pool } from '../pool';
import type { Queryable } from '../types';
import type { Organization } from '../../domain';

interface OrgBillingRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  commercial_plan: string;
  event_credits_balance: number | null;
  event_credits_expire_at: string | null;
  billing_source: string;
  subscription_status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface OrgBilling extends Organization {
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const mapBilling = (r: OrgBillingRow): OrgBilling => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  createdAt: r.created_at,
  commercialPlan: r.commercial_plan,
  eventCreditsBalance: r.event_credits_balance,
  eventCreditsExpireAt: r.event_credits_expire_at
    ? new Date(r.event_credits_expire_at).toISOString()
    : null,
  billingSource: r.billing_source,
  subscriptionStatus: r.subscription_status,
  currentPeriodEnd: r.current_period_end
    ? new Date(r.current_period_end).toISOString()
    : null,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
});

const COLS = `id, name, slug, created_at, commercial_plan, event_credits_balance,
  event_credits_expire_at, billing_source, subscription_status, current_period_end,
  stripe_customer_id, stripe_subscription_id`;

export async function findOrgBilling(
  organizationId: string,
  db: Queryable = pool,
): Promise<OrgBilling | null> {
  const { rows } = await db.query<OrgBillingRow>(
    `SELECT ${COLS} FROM organizations WHERE id = $1`,
    [organizationId],
  );
  return rows[0] ? mapBilling(rows[0]) : null;
}

/** Organisation propriétaire d'une souscription Stripe (renouvellements). */
export async function findOrgIdByStripeSubscription(
  stripeSubscriptionId: string,
  db: Queryable = pool,
): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    'SELECT id FROM organizations WHERE stripe_subscription_id = $1',
    [stripeSubscriptionId],
  );
  return rows[0]?.id ?? null;
}

export async function setOrgCommercialPlan(
  organizationId: string,
  input: {
    commercialPlan: string;
    eventCreditsBalance: number | null;
    eventCreditsExpireAt: Date | null;
    billingSource: string;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE organizations
       SET commercial_plan = $2,
           event_credits_balance = $3,
           event_credits_expire_at = $4,
           billing_source = $5
     WHERE id = $1`,
    [
      organizationId,
      input.commercialPlan,
      input.eventCreditsBalance,
      input.eventCreditsExpireAt,
      input.billingSource,
    ],
  );
}

/**
 * Consomme 1 crédit événement de façon atomique.
 * Retourne false si solde insuffisant ou crédits expirés.
 * true si illimité (balance NULL) ou débit réussi.
 */
export async function tryConsumeEventCredit(
  organizationId: string,
  db: Queryable = pool,
): Promise<{ ok: boolean; reason?: string }> {
  const { rows } = await db.query<{
    event_credits_balance: number | null;
    event_credits_expire_at: Date | null;
  }>(
    `SELECT event_credits_balance, event_credits_expire_at
       FROM organizations WHERE id = $1 FOR UPDATE`,
    [organizationId],
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: 'Organisation introuvable' };

  // Illimité (legacy / comped)
  if (row.event_credits_balance == null) return { ok: true };

  if (row.event_credits_expire_at && new Date(row.event_credits_expire_at).getTime() < Date.now()) {
    return { ok: false, reason: 'Crédits événement expirés. Renouvelez votre pack ou offre.' };
  }
  if (row.event_credits_balance <= 0) {
    return {
      ok: false,
      reason: 'Aucun crédit événement disponible. Achetez une licence ou un pack.',
    };
  }

  await db.query(
    `UPDATE organizations
       SET event_credits_balance = event_credits_balance - 1
     WHERE id = $1 AND event_credits_balance > 0`,
    [organizationId],
  );
  return { ok: true };
}

/** Ajoute des crédits (achat pack, extra agence, grant). */
export async function addEventCredits(
  organizationId: string,
  delta: number,
  opts: {
    commercialPlan?: string;
    extendExpireMonths?: number | null;
    billingSource?: string;
  } = {},
  db: Queryable = pool,
): Promise<void> {
  const { rows } = await db.query<{
    event_credits_balance: number | null;
    event_credits_expire_at: Date | null;
  }>(
    `SELECT event_credits_balance, event_credits_expire_at
       FROM organizations WHERE id = $1 FOR UPDATE`,
    [organizationId],
  );
  const row = rows[0];
  if (!row) throw new Error('Organisation introuvable');

  // Si l'org était illimitée (legacy), on ne force pas un solde — sauf grant explicite.
  let newBalance: number | null;
  if (row.event_credits_balance == null && opts.commercialPlan === 'legacy') {
    newBalance = null;
  } else if (row.event_credits_balance == null) {
    newBalance = delta;
  } else {
    newBalance = row.event_credits_balance + delta;
  }

  let expireAt = row.event_credits_expire_at;
  if (opts.extendExpireMonths != null && opts.extendExpireMonths > 0) {
    const base =
      expireAt && new Date(expireAt).getTime() > Date.now()
        ? new Date(expireAt)
        : new Date();
    base.setMonth(base.getMonth() + opts.extendExpireMonths);
    expireAt = base;
  }

  await db.query(
    `UPDATE organizations
       SET event_credits_balance = $2,
           event_credits_expire_at = $3,
           commercial_plan = COALESCE($4, commercial_plan),
           billing_source = COALESCE($5, billing_source)
     WHERE id = $1`,
    [
      organizationId,
      newBalance,
      expireAt,
      opts.commercialPlan ?? null,
      opts.billingSource ?? null,
    ],
  );
}

export async function insertBillingLedger(
  input: {
    organizationId: string | null;
    planCode: string;
    creditsDelta: number;
    stripeSessionId?: string | null;
    stripePaymentIntent?: string | null;
    eventId?: string | null;
    note?: string | null;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO billing_ledger
      (organization_id, plan_code, credits_delta, stripe_session_id, stripe_payment_intent, event_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.organizationId,
      input.planCode,
      input.creditsDelta,
      input.stripeSessionId ?? null,
      input.stripePaymentIntent ?? null,
      input.eventId ?? null,
      input.note ?? null,
    ],
  );
}

export async function setEventMediaPlus(
  eventId: string,
  storageQuotaBytes: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE events SET media_plus = true, storage_quota_bytes = $2 WHERE id = $1`,
    [eventId, storageQuotaBytes],
  );
}
