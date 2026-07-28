import { pool } from '../pool';
import type { Queryable } from '../types';

export interface AuditEntry {
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  organizationId: string | null;
  method: string;
  route: string;
  resourceParams: Record<string, string>;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
}

/** Consigne une action d'administration. Ne doit jamais faire échouer la requête appelante. */
export async function insertAuditEntry(entry: AuditEntry, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO audit_log
       (actor_user_id, actor_email, actor_role, organization_id,
        method, route, resource_params, status_code, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
    [
      entry.actorUserId,
      entry.actorEmail,
      entry.actorRole,
      entry.organizationId,
      entry.method,
      entry.route,
      JSON.stringify(entry.resourceParams),
      entry.statusCode,
      entry.ip,
      entry.userAgent,
    ],
  );
}

export interface AuditRow extends AuditEntry {
  id: string;
  occurredAt: string;
}

/** Lecture du journal, scopée à une organisation (ou globale pour la plateforme). */
export async function listAuditEntries(
  { organizationId, limit = 200 }: { organizationId: string | null; limit?: number },
  db: Queryable = pool,
): Promise<AuditRow[]> {
  const { rows } = await db.query<{
    id: string;
    occurred_at: string;
    actor_user_id: string;
    actor_email: string;
    actor_role: string;
    organization_id: string | null;
    method: string;
    route: string;
    resource_params: Record<string, string>;
    status_code: number;
    ip: string | null;
    user_agent: string | null;
  }>(
    `SELECT * FROM audit_log
     WHERE ($1::uuid IS NULL OR organization_id = $1)
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [organizationId, Math.min(limit, 1000)],
  );
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    actorRole: r.actor_role,
    organizationId: r.organization_id,
    method: r.method,
    route: r.route,
    resourceParams: r.resource_params,
    statusCode: r.status_code,
    ip: r.ip,
    userAgent: r.user_agent,
  }));
}

/**
 * Limitation de conservation (RGPD art. 5.1.e) : le journal d'audit est lui-même une
 * donnée personnelle. Purge au-delà de la durée retenue.
 */
export async function purgeAuditEntriesOlderThan(
  months: number,
  db: Queryable = pool,
): Promise<number> {
  const { rowCount } = await db.query(
    `DELETE FROM audit_log WHERE occurred_at < now() - make_interval(months => $1)`,
    [months],
  );
  return rowCount ?? 0;
}
