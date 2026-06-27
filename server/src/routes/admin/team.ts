import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { inviteCollaborator, resendInvitation } from '../../services/invitationService';
import { deleteInvitation } from '../../db/repositories/invitationRepo';
import { changeUserActive, changeUserRole, getTeam, setUserEvents } from '../../services/teamService';

export const teamRouter = Router();

// Gestion de l'équipe : entièrement réservée aux administrateurs.
teamRouter.use(requireAuth, requireRole('admin'));

const ROLE = z.enum(['admin', 'attache', 'assistant']);

teamRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await getTeam());
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
    const invitation = await inviteCollaborator({ ...body, invitedBy: req.user!.sub });
    // On ne renvoie pas le jeton : il n'existe que dans l'email envoyé.
    sendData(res, { id: invitation.id, email: invitation.email, role: invitation.role }, 201);
  }),
);

// Renvoyer une invitation (nouveau jeton + nouvel email).
teamRouter.post(
  '/invitations/:id/resend',
  asyncHandler(async (req, res) => {
    const inv = await resendInvitation(req.params.id!, req.user!.sub);
    sendData(res, { id: inv.id, email: inv.email });
  }),
);

// Annuler/révoquer une invitation en attente.
teamRouter.delete(
  '/invitations/:id',
  asyncHandler(async (req, res) => {
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
    sendData(res, await changeUserRole(req.params.userId!, role));
  }),
);

const ActiveSchema = z.object({ active: z.boolean() });
teamRouter.post(
  '/:userId/active',
  validateBody(ActiveSchema),
  asyncHandler(async (req, res) => {
    const { active } = req.body as z.infer<typeof ActiveSchema>;
    sendData(res, await changeUserActive(req.params.userId!, active));
  }),
);

const EventsSchema = z.object({ eventIds: z.array(z.string().uuid()) });
teamRouter.put(
  '/:userId/events',
  validateBody(EventsSchema),
  asyncHandler(async (req, res) => {
    const { eventIds } = req.body as z.infer<typeof EventsSchema>;
    sendData(res, await setUserEvents(req.params.userId!, eventIds));
  }),
);
