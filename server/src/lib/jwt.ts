import jwt from 'jsonwebtoken';
import type { UserRole } from '@pr-event-360/core';
import { loadEnv } from '../config/env';

const env = loadEnv();
const EXPIRES_IN = '12h';

export interface AuthClaims {
  sub: string; // user id
  email: string;
  role: UserRole;
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): AuthClaims {
  return jwt.verify(token, env.JWT_SECRET) as AuthClaims;
}

// ── Challenge MFA : jeton court (5 min) émis après le mot de passe, échangé contre
// un vrai jeton de session une fois le code TOTP validé. Marqué typ:'mfa' pour ne
// jamais pouvoir servir de jeton de session.
const MFA_CHALLENGE_EXPIRES_IN = '5m';

export function signMfaChallenge(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'mfa' }, env.JWT_SECRET, { expiresIn: MFA_CHALLENGE_EXPIRES_IN });
}

export function verifyMfaChallenge(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; typ?: string };
  if (payload.typ !== 'mfa') throw new Error('Jeton de challenge MFA invalide');
  return payload.sub;
}
