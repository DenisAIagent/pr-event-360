import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import { signToken } from '../lib/jwt';
import { createOrganization, findOrganizationBySlug } from '../db/repositories/organizationRepo';
import { createUser, findUserByEmail } from '../db/repositories/userRepo';
import type { User } from '../domain';

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
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!(await findOrganizationBySlug(base))) return base;
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}-${randomBytes(2).toString('hex')}`;
    if (!(await findOrganizationBySlug(candidate))) return candidate;
  }
  return `${base}-${randomBytes(4).toString('hex')}`;
}

/**
 * Inscription self-service : crée une organisation + son premier compte (admin de l'org),
 * en transaction, puis renvoie un jeton de session (connexion immédiate).
 */
export async function signUp(input: {
  orgName: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: User }> {
  const email = input.email.toLowerCase();
  if (await findUserByEmail(email)) {
    throw AppError.conflict('Un compte existe déjà avec cet email');
  }
  const orgName = input.orgName.trim();
  if (!orgName) throw AppError.badRequest("Le nom de l'organisation est requis");
  const slug = await uniqueSlug(orgName);
  const passwordHash = await argon2.hash(input.password);

  const user = await withTransaction(async (db) => {
    const org = await createOrganization({ name: orgName, slug }, db);
    return createUser(
      { email, passwordHash, fullName: input.fullName, role: 'admin', organizationId: org.id },
      db,
    );
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    isPlatformAdmin: user.isPlatformAdmin,
  });
  return { token, user };
}
