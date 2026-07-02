import type { UserRole } from '@pr-event-360/core';

/**
 * Politique MFA obligatoire : les comptes à privilèges élevés DOIVENT activer la
 * double authentification. Concerne les admins d'organisation (gestion des comptes,
 * clés API) et les super-admins plateforme (réglages partagés). Les rôles
 * « attaché » et « assistant » ne sont pas soumis à l'obligation.
 */
export function mfaRequiredFor(role: UserRole, isPlatformAdmin: boolean): boolean {
  return role === 'admin' || isPlatformAdmin;
}
