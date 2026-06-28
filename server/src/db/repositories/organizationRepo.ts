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
