import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  addRequestNote,
  assignRequest,
  getRequestTimeline,
  listAssignableUsers,
} from '../../services/collabService';

/**
 * Collaboration équipe sur les demandes : assignation, notes internes, timeline.
 */
export const eventCollabRouter = Router();
eventCollabRouter.use(requireAuth);

eventCollabRouter.get(
  '/:eventId/assignees',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await listAssignableUsers(req.params.eventId!));
  }),
);

eventCollabRouter.patch(
  '/:eventId/requests/:requestId/assign',
  validateBody(z.object({ userId: z.string().uuid().nullable() })),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { userId } = req.body as { userId: string | null };
    sendData(
      res,
      await assignRequest({
        eventId: req.params.eventId!,
        requestId: req.params.requestId!,
        userId,
        actorId: req.user!.sub,
      }),
    );
  }),
);

eventCollabRouter.get(
  '/:eventId/requests/:requestId/timeline',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    res.setHeader('Cache-Control', 'no-store');
    sendData(res, await getRequestTimeline(req.params.eventId!, req.params.requestId!));
  }),
);

eventCollabRouter.post(
  '/:eventId/requests/:requestId/notes',
  validateBody(
    z.object({
      body: z.string().trim().min(1, 'Note requise').max(2000, '2000 caractères maximum'),
    }),
  ),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { body } = req.body as { body: string };
    sendData(
      res,
      await addRequestNote({
        eventId: req.params.eventId!,
        requestId: req.params.requestId!,
        authorId: req.user!.sub,
        body,
      }),
      201,
    );
  }),
);
