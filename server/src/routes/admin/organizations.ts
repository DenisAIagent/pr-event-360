import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { AppError } from '../../http/AppError';
import { signToken } from '../../lib/jwt';
import {
  createOrganization,
  findOrganizationById,
  listOrganizationsWithCounts,
} from '../../db/repositories/organizationRepo';
import { findUserById } from '../../db/repositories/userRepo';
import { uniqueSlug } from '../../services/orgService';
import { inviteCollaborator } from '../../services/invitationService';

export const organizationsRouter = Router();

// Console super-admin plateforme : vue, bascule et création d'organisations.
organizationsRouter.use(requireAuth, requirePlatformAdmin);

organizationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await listOrganizationsWithCounts());
  }),
);

// Onboarding manuel : crée une organisation (active) + invite son admin par email.
const CreateOrgSchema = z.object({
  orgName: z.string().min(1).max(120),
  adminEmail: z.string().email(),
});
organizationsRouter.post(
  '/',
  validateBody(CreateOrgSchema),
  asyncHandler(async (req, res) => {
    const { orgName, adminEmail } = req.body as z.infer<typeof CreateOrgSchema>;
    const slug = await uniqueSlug(orgName);
    const org = await createOrganization({ name: orgName.trim(), slug });
    await inviteCollaborator({
      organizationId: org.id,
      email: adminEmail.toLowerCase(),
      role: 'admin',
      eventIds: [],
      invitedBy: req.user!.sub,
    });
    sendData(res, { id: org.id, name: org.name, slug: org.slug }, 201);
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
