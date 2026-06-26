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
