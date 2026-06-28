import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@pr-event-360/core';
import { EVENT_EDITOR_ROLES } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { verifyToken, type AuthClaims } from '../lib/jwt';

// Étend Request avec l'utilisateur authentifié (back-office).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

/** Protège les routes du back-office : exige un JWT valide (Bearer). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Jeton manquant');
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    next();
  } catch {
    throw AppError.unauthorized('Jeton invalide ou expiré');
  }
}

/**
 * Exige que l'utilisateur authentifié ait l'un des rôles indiqués. À placer APRÈS
 * requireAuth. Ex. requireRole('admin') pour la gestion des comptes et des clés API.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('Vous n’avez pas les droits nécessaires');
    }
    next();
  };
}

/**
 * Exige un rôle autorisé à ÉDITER la configuration d'un événement (admin ou attaché).
 * L'assistant peut consulter et traiter les demandes, mais pas modifier la config.
 */
export function requireEventEditor(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw AppError.unauthorized();
  if (!(EVENT_EDITOR_ROLES as readonly UserRole[]).includes(req.user.role)) {
    throw AppError.forbidden('Action réservée aux administrateurs et attachés de presse');
  }
  next();
}

/**
 * Exige le rôle SUPER-ADMIN PLATEFORME (opérateur). Réservé aux réglages partagés
 * (clés d'intégration Brevo/Twilio/Cloudinary), invisibles des admins d'organisation.
 */
export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw AppError.unauthorized();
  if (!req.user.isPlatformAdmin) {
    throw AppError.forbidden('Réservé à l’administrateur de la plateforme');
  }
  next();
}
