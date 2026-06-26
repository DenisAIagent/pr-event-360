import argon2 from 'argon2';
import type { UserRole } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { signToken } from '../lib/jwt';
import { createUser, findUserByEmailWithHash } from '../db/repositories/userRepo';
import type { User } from '../domain';

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}): Promise<User> {
  const passwordHash = await argon2.hash(input.password);
  try {
    return await createUser({
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw AppError.conflict('Un compte existe déjà avec cet email');
    throw err;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const found = await findUserByEmailWithHash(email.toLowerCase());
  // Message générique : on ne révèle pas si l'email existe.
  const invalid = AppError.unauthorized('Email ou mot de passe incorrect');
  if (!found) {
    // Hachage factice pour éviter de divulguer l'existence du compte par timing.
    await argon2.hash(password).catch(() => undefined);
    throw invalid;
  }
  const ok = await argon2.verify(found.passwordHash, password);
  if (!ok) throw invalid;

  // Compte désactivé par un admin : accès refusé même avec le bon mot de passe.
  if (!found.user.active) {
    throw AppError.forbidden('Ce compte a été désactivé. Contactez un administrateur.');
  }

  const token = signToken({ sub: found.user.id, email: found.user.email, role: found.user.role });
  return { token, user: found.user };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
