import { OAuth2Client } from 'google-auth-library';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { signToken, signGoogleChallenge, verifyGoogleChallenge } from '../lib/jwt';
import { findUserByGoogleId, findUserByEmail, linkGoogleId } from '../db/repositories/userRepo';
import { signUpWithGoogle } from './orgService';
import type { User } from '../domain';

const env = loadEnv();
let client: OAuth2Client | null = null;

export function isGoogleEnabled(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID);
}
export function googleClientId(): string | null {
  return env.GOOGLE_CLIENT_ID ?? null;
}

function googleClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID) throw AppError.badRequest('La connexion Google n’est pas configurée.');
  if (!client) client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return client;
}

interface VerifiedGoogle {
  googleId: string;
  email: string;
  name: string;
}

/** Vérifie l'ID token Google (signature + audience) et exige un email vérifié. */
async function verifyIdToken(idToken: string): Promise<VerifiedGoogle> {
  const ticket = await googleClient()
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID! })
    .catch(() => null);
  const payload = ticket?.getPayload();
  if (!payload?.sub || !payload.email) throw AppError.unauthorized('Jeton Google invalide.');
  if (!payload.email_verified) throw AppError.unauthorized('Email Google non vérifié.');
  return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name ?? payload.email };
}

function sessionFor(user: User): { token: string; user: User } {
  return {
    token: signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      isPlatformAdmin: user.isPlatformAdmin,
    }),
    user,
  };
}

export type GoogleLoginResult =
  | { token: string; user: User }
  | { needsOrg: true; challenge: string; fullName: string; email: string };

/**
 * Connexion via Google :
 * 1) compte déjà lié → session ;
 * 2) email existant (créé en mot de passe) → liaison automatique (Google a vérifié l'email) ;
 * 3) inconnu → besoin du nom de l'organisation (challenge court renvoyé).
 */
export async function loginWithGoogle(idToken: string): Promise<GoogleLoginResult> {
  const g = await verifyIdToken(idToken);

  const byGoogle = await findUserByGoogleId(g.googleId);
  if (byGoogle) {
    if (!byGoogle.active) throw AppError.forbidden('Ce compte a été désactivé. Contactez un administrateur.');
    return sessionFor(byGoogle);
  }

  const byEmail = await findUserByEmail(g.email);
  if (byEmail) {
    if (!byEmail.active) throw AppError.forbidden('Ce compte a été désactivé. Contactez un administrateur.');
    await linkGoogleId(byEmail.id, g.googleId);
    return sessionFor(byEmail);
  }

  return { needsOrg: true, challenge: signGoogleChallenge(g), fullName: g.name, email: g.email };
}

/** Finalise l'inscription Google après saisie du nom de l'organisation. */
export async function completeGoogleSignup(
  challenge: string,
  orgName: string,
): Promise<{ token: string; user: User }> {
  let claims;
  try {
    claims = verifyGoogleChallenge(challenge);
  } catch {
    throw AppError.badRequest('Session Google expirée, recommencez.');
  }
  return signUpWithGoogle({
    orgName,
    fullName: claims.name,
    email: claims.email,
    googleId: claims.googleId,
  });
}
