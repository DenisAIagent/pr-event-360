import { randomBytes } from 'node:crypto';
import { findOrganizationBySlug } from '../db/repositories/organizationRepo';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org'
  );
}

/** Trouve un slug d'organisation libre (base, sinon base-xxxx). */
export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!(await findOrganizationBySlug(base))) return base;
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}-${randomBytes(2).toString('hex')}`;
    if (!(await findOrganizationBySlug(candidate))) return candidate;
  }
  return `${base}-${randomBytes(4).toString('hex')}`;
}
