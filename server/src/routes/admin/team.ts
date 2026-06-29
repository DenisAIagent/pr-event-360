import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { inviteCollaborator, resendInvitation } from '../../services/invitationService';
import { deleteInvitation, findInvitationById } from '../../db/repositories/invitationRepo';
import { AppError } from '../../http/AppError';
import { changeUserActive, changeUserRole, deleteTeamMember, getTeam, setUserEvents } from '../../services/teamService';

export const teamRouter = Router();

// Gestion de l'équipe : réservée aux administrateurs, scopée à LEUR organisation.
teamRouter.use(requireAuth, requireRole('admin'));

const ROLE = z.enum(['admin', 'attache', 'assistant']);

teamRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    sendData(res, await getTeam(req.user!.organizationId));
  }),
);

const InviteSchema = z.object({
  email: z.string().email(),
  role: ROLE,
  eventIds: z.array(z.string().uuid()).default([]),
});
teamRouter.post(
  '/invite',
  validateBody(InviteSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof InviteSchema>;
    const invitation = await inviteCollaborator({
      ...body,
      organizationId: req.user!.organizationId,
      invitedBy: req.user!.sub,
    });
    sendData(res, { id: invitation.id, email: invitation.email, role: invitation.role }, 201);
  }),
);

// Renvoyer une invitation (nouveau jeton + nouvel email). Scopé à l'organisation.
teamRouter.post(
  '/invitations/:id/resend',
  asyncHandler(async (req, res) => {
    const inv = await resendInvitation(req.params.id!, req.user!.sub, req.user!.organizationId);
    sendData(res, { id: inv.id, email: inv.email });
  }),
);

// Annuler/révoquer une invitation en attente (de son organisation uniquement).
teamRouter.delete(
  '/invitations/:id',
  asyncHandler(async (req, res) => {
    const inv = await findInvitationById(req.params.id!);
    if (!inv || inv.organizationId !== req.user!.organizationId) {
      throw AppError.notFound('Invitation introuvable');
    }
    await deleteInvitation(req.params.id!);
    sendData(res, { deleted: true });
  }),
);

const RoleSchema = z.object({ role: ROLE });
teamRouter.post(
  '/:userId/role',
  validateBody(RoleSchema),
  asyncHandler(async (req, res) => {
    const { role } = req.body as z.infer<typeof RoleSchema>;
    sendData(res, await changeUserRole(req.user!.organizationId, req.params.userId!, role));
  }),
);

const ActiveSchema = z.object({ active: z.boolean() });
teamRouter.post(
  '/:userId/active',
  validateBody(ActiveSchema),
  asyncHandler(async (req, res) => {
    const { active } = req.body as z.infer<typeof ActiveSchema>;
    sendData(res, await changeUserActive(req.user!.organizationId, req.params.userId!, active));
  }),
);

const EventsSchema = z.object({ eventIds: z.array(z.string().uuid()) });
teamRouter.put(
  '/:userId/events',
  validateBody(EventsSchema),
  asyncHandler(async (req, res) => {
    const { eventIds } = req.body as z.infer<typeof EventsSchema>;
    sendData(res, await setUserEvents(req.user!.organizationId, req.params.userId!, eventIds));
  }),
);

// Supprimer définitivement un compte de l'organisation (réattribue ses événements à l'admin).
teamRouter.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    await deleteTeamMember(req.user!.organizationId, req.user!.sub, req.params.userId!);
    sendData(res, { deleted: true });
  }),
);
