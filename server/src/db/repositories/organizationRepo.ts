import { pool } from '../pool';
import type { Queryable } from '../types';
import type { Organization } from '../../domain';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const map = (r: OrgRow): Organization => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  createdAt: r.created_at,
});

export async function createOrganization(
  input: { name: string; slug: string },
  db: Queryable = pool,
): Promise<Organization> {
  const { rows } = await db.query<OrgRow>(
    'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at',
    [input.name, input.slug],
  );
  return map(rows[0]!);
}

export async function findOrganizationBySlug(
  slug: string,
  db: Queryable = pool,
): Promise<Organization | null> {
  const { rows } = await db.query<OrgRow>(
    'SELECT id, name, slug, created_at FROM organizations WHERE slug = $1',
    [slug],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function findOrganizationById(
  id: string,
  db: Queryable = pool,
): Promise<Organization | null> {
  const { rows } = await db.query<OrgRow>(
    'SELECT id, name, slug, created_at FROM organizations WHERE id = $1',
    [id],
  );
  return rows[0] ? map(rows[0]) : null;
}

/** Enregistre l'abonnement Stripe d'une organisation (après paiement validé). */
export async function setOrgSubscription(
  orgId: string,
  input: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodEnd: string | null;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE organizations
       SET stripe_customer_id = $2, stripe_subscription_id = $3, subscription_status = $4, current_period_end = $5
     WHERE id = $1`,
    [orgId, input.stripeCustomerId, input.stripeSubscriptionId, input.status, input.currentPeriodEnd],
  );
}

/** Met à jour le statut d'abonnement à partir de l'identifiant d'abonnement Stripe. */
export async function updateSubscriptionStatusBySubId(
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: string | null,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE organizations
       SET subscription_status = $2, current_period_end = COALESCE($3, current_period_end)
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId, status, currentPeriodEnd],
  );
}

export interface OrganizationSummary extends Organization {
  eventCount: number;
  userCount: number;
}

/** Toutes les organisations + compteurs (console super-admin plateforme). */
export async function listOrganizationsWithCounts(db: Queryable = pool): Promise<OrganizationSummary[]> {
  const { rows } = await db.query<OrgRow & { event_count: number; user_count: number }>(
    `SELECT o.id, o.name, o.slug, o.created_at,
            (SELECT count(*) FROM events e WHERE e.organization_id = o.id)::int AS event_count,
            (SELECT count(*) FROM users u WHERE u.organization_id = o.id)::int AS user_count
     FROM organizations o
     ORDER BY o.created_at ASC`,
  );
  return rows.map((r) => ({ ...map(r), eventCount: r.event_count, userCount: r.user_count }));
}
