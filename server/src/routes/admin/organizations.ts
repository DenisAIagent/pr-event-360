import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { AppError } from '../../http/AppError';
import { signToken } from '../../lib/jwt';
import { findOrganizationById, listOrganizationsWithCounts } from '../../db/repositories/organizationRepo';
import { findUserById } from '../../db/repositories/userRepo';

export const organizationsRouter = Router();

// Console super-admin plateforme : vue et bascule entre toutes les organisations.
organizationsRouter.use(requireAuth, requirePlatformAdmin);

organizationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await listOrganizationsWithCounts());
  }),
);

/**
 * Bascule le contexte du super-admin vers une organisation : réémet un jeton avec
 * `organizationId` ciblé. Tout le scoping existant s'applique alors à cette organisation.
 */
organizationsRouter.post(
  '/:orgId/switch',
  asyncHandler(async (req, res) => {
    const org = await findOrganizationById(req.params.orgId!);
    if (!org) throw AppError.notFound('Organisation introuvable');

    const user = await findUserById(req.user!.sub);
    if (!user) throw AppError.unauthorized();

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
      isPlatformAdmin: user.isPlatformAdmin,
    });
    // Le DTO renvoyé reflète l'organisation active (pour l'affichage du rail).
    sendData(res, { token, user: { ...user, organizationId: org.id, organizationName: org.name } });
  }),
);
