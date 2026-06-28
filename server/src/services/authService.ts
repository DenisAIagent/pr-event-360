import argon2 from 'argon2';
import type { UserRole } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { signToken, signMfaChallenge, verifyMfaChallenge } from '../lib/jwt';
import {
  createUser,
  findUserByEmailWithHash,
  findUserById,
  getUserMfa,
} from '../db/repositories/userRepo';
import { verifyMfaCode } from './mfaService';
import type { User } from '../domain';

/** Résultat d'un login : soit un jeton de session, soit un challenge MFA à compléter. */
export type LoginResult =
  | { token: string; user: User }
  | { mfaRequired: true; challenge: string };

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  organizationId: string;
  isPlatformAdmin?: boolean;
}): Promise<User> {
  const passwordHash = await argon2.hash(input.password);
  try {
    return await createUser({
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      organizationId: input.organizationId,
      isPlatformAdmin: input.isPlatformAdmin,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw AppError.conflict('Un compte existe déjà avec cet email');
    throw err;
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
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

  // Si la double authentification est active : on n'émet PAS encore de jeton de session,
  // mais un challenge court à échanger contre un code TOTP valide.
  const mfa = await getUserMfa(found.user.id);
  if (mfa?.enabled) {
    return { mfaRequired: true, challenge: signMfaChallenge(found.user.id) };
  }

  const token = signToken({
    sub: found.user.id,
    email: found.user.email,
    role: found.user.role,
    organizationId: found.user.organizationId,
    isPlatformAdmin: found.user.isPlatformAdmin,
  });
  return { token, user: found.user };
}

/** Deuxième étape du login MFA : échange le challenge + code TOTP contre un jeton de session. */
export async function completeMfaLogin(
  challenge: string,
  code: string,
): Promise<{ token: string; user: User }> {
  let userId: string;
  try {
    userId = verifyMfaChallenge(challenge);
  } catch {
    throw AppError.unauthorized('Session de connexion expirée, recommencez.');
  }
  if (!(await verifyMfaCode(userId, code))) {
    throw AppError.unauthorized('Code de double authentification incorrect.');
  }
  const user = await findUserById(userId);
  if (!user || !user.active) throw AppError.unauthorized('Compte indisponible.');
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    isPlatformAdmin: user.isPlatformAdmin,
  });
  return { token, user };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
