import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { AppError } from '../../http/AppError';
import { signToken } from '../../lib/jwt';
import { issueSession } from '../../lib/session';
import {
  createOrganization,
  findOrganizationById,
  listOrganizationsWithCounts,
} from '../../db/repositories/organizationRepo';
import { findUserById } from '../../db/repositories/userRepo';
import { uniqueSlug } from '../../services/orgService';
import { inviteCollaborator } from '../../services/invitationService';
import { createOrgInviteLink } from '../../services/orgInviteService';
import { deleteOrganization, deleteAccountByEmail } from '../../services/accountAdminService';

export const organizationsRouter = Router();

// Console super-admin plateforme : vue, bascule et création d'organisations.
organizationsRouter.use(requireAuth, requirePlatformAdmin);

organizationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await listOrganizationsWithCounts());
  }),
);

// Invitation à s'inscrire : on invite un email, l'invité crée lui-même son organisation
// (accès offert, sans paiement). Renvoie un lien copiable (à partager soi-même).
const InviteOrgSchema = z.object({ email: z.string().email() });
organizationsRouter.post(
  '/invite',
  validateBody(InviteOrgSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof InviteOrgSchema>;
    sendData(res, await createOrgInviteLink(email, req.user!.sub), 201);
  }),
);

// Onboarding manuel (alternatif) : crée directement une organisation + invite son admin.
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

// Supprime DÉFINITIVEMENT une organisation cliente et toutes ses données (super-admin).
organizationsRouter.delete(
  '/:orgId',
  asyncHandler(async (req, res) => {
    await deleteOrganization(req.params.orgId!, req.user!.sub);
    sendData(res, { deleted: true });
  }),
);

// Supprime n'importe quel compte par email (super-admin) — libère l'email.
const DeleteAccountSchema = z.object({ email: z.string().email() });
organizationsRouter.post(
  '/delete-account',
  validateBody(DeleteAccountSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof DeleteAccountSchema>;
    sendData(res, await deleteAccountByEmail(email, req.user!.sub));
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
    // Nouvelle session (org active différente) → on remplace le cookie httpOnly.
    issueSession(res, token);
    // Le DTO renvoyé reflète l'organisation active (pour l'affichage du rail).
    sendData(res, { user: { ...user, organizationId: org.id, organizationName: org.name } });
  }),
);
