import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@pr-event-360/core';
import { EVENT_EDITOR_ROLES } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { verifyToken, type AuthClaims } from '../lib/jwt';
import { csrfValid, sessionTokenFromCookie } from '../lib/session';
import { findUserAuthState, getUserMfa } from '../db/repositories/userRepo';
import { mfaRequiredFor } from '../lib/mfaPolicy';

// Endpoints accessibles à une session « MFA obligatoire non encore activée » :
// juste de quoi s'enrôler (ou se déconnecter). Tout le reste est bloqué tant que
// la double authentification n'est pas activée.
const MFA_ENROLLMENT_ALLOWLIST = new Set([
  '/api/admin/auth/me',
  '/api/admin/auth/mfa/status',
  '/api/admin/auth/mfa/setup',
  '/api/admin/auth/mfa/enable',
  '/api/admin/auth/logout',
]);

// Étend Request avec l'utilisateur authentifié (back-office).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthClaims;
      authVia?: 'cookie' | 'bearer';
    }
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACTIVE_SUBSCRIPTIONS = new Set(['active', 'trialing']);

/**
 * Protège les routes du back-office : exige un JWT valide, lu en PRIORITÉ dans le cookie
 * de session httpOnly (non volable par XSS), avec repli sur l'en-tête `Authorization: Bearer`
 * (clients API, tests). Pour une session par COOKIE (envoyé automatiquement par le navigateur),
 * les requêtes mutantes exigent en plus un jeton CSRF valide (double-submit) — le Bearer, lui,
 * n'est pas rejouable cross-site donc n'a pas besoin de CSRF.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = sessionTokenFromCookie(req);
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    // Un en-tête Bearer EXPLICITE prime (clients API/tests) : il n'est pas rejouable cross-site,
    // donc pas de risque CSRF. Sinon on retombe sur le cookie de session (navigateur).
    const token = bearer ?? cookieToken;
    if (!token) throw AppError.unauthorized('Jeton manquant');

    let claims: AuthClaims;
    try {
      claims = verifyToken(token);
    } catch {
      throw AppError.unauthorized('Jeton invalide ou expiré');
    }

    // Le JWT prouve l'identité, mais les droits doivent être relus en base :
    // désactivation, changement de rôle, révocation super-admin et abonnement actif
    // prennent effet immédiatement, sans attendre l'expiration du jeton.
    const current = await findUserAuthState(claims.sub);
    if (!current) throw AppError.unauthorized('Compte introuvable');
    if (!current.active) throw AppError.unauthorized('Compte désactivé. Reconnectez-vous avec un compte actif.');
    if (!ACTIVE_SUBSCRIPTIONS.has(current.subscriptionStatus)) {
      throw AppError.forbidden('Abonnement inactif. Renouvelez votre abonnement pour accéder à votre espace.');
    }

    // Révocation de session : un jeton émis AVANT le dernier changement de mot de passe
    // est refusé (un reset invalide immédiatement les sessions ouvertes avec l'ancien).
    if (current.passwordChangedAt && claims.iat && claims.iat * 1000 < current.passwordChangedAt.getTime()) {
      throw AppError.unauthorized('Session expirée (mot de passe modifié). Reconnectez-vous.');
    }

    req.user = {
      sub: current.id,
      email: current.email,
      role: current.role,
      // Le super-admin peut travailler dans une organisation cible via /switch.
      // Si son statut super-admin est retiré, on revient immédiatement à son org réelle.
      organizationId: current.isPlatformAdmin ? claims.organizationId : current.organizationId,
      isPlatformAdmin: current.isPlatformAdmin,
      iat: claims.iat,
    };
    req.authVia = bearer ? 'bearer' : 'cookie';

    if (req.authVia === 'cookie' && MUTATING.has(req.method) && !csrfValid(req)) {
      throw AppError.forbidden('Jeton CSRF manquant ou invalide');
    }

    // MFA obligatoire : un compte à privilèges élevés sans MFA active ne peut
    // atteindre QUE les endpoints d'enrôlement. Contrôle sur la vérité DB (pas sur
    // le jeton), donc effet immédiat et non contournable en forgeant un jeton.
    if (mfaRequiredFor(current.role, current.isPlatformAdmin)) {
      const path = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
      if (!MFA_ENROLLMENT_ALLOWLIST.has(path)) {
        const mfa = await getUserMfa(current.id);
        if (!mfa?.enabled) {
          throw new AppError(403, 'Double authentification obligatoire : activez-la pour continuer.', {
            code: 'MFA_SETUP_REQUIRED',
          });
        }
      }
    }
    next();
  } catch (err) {
    next(err);
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
