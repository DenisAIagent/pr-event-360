import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  buildJournalistBadge,
  checkInArrival,
  checkInConference,
  getDayOfSnapshot,
  undoCheckInArrival,
} from '../../services/dayOfService';

/**
 * Jour J : agenda du jour, check-in d'arrivée (accueil physique), badge journaliste, check-in conférence.
 */
export const eventDayOfRouter = Router();
eventDayOfRouter.use(requireAuth);

eventDayOfRouter.get(
  '/:eventId/day-of',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    res.setHeader('Cache-Control', 'no-store');
    sendData(res, await getDayOfSnapshot(req.params.eventId!, date));
  }),
);

eventDayOfRouter.post(
  '/:eventId/check-in',
  validateBody(
    z
      .object({
        journalistId: z.string().uuid().optional(),
        code: z.string().min(1).optional(),
      })
      .refine((d) => d.journalistId || d.code, { message: 'journalistId ou code requis' }),
  ),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as { journalistId?: string; code?: string };
    sendData(res, await checkInArrival(req.params.eventId!, body));
  }),
);

eventDayOfRouter.post(
  '/:eventId/check-in/undo',
  validateBody(z.object({ journalistId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { journalistId } = req.body as { journalistId: string };
    sendData(res, await undoCheckInArrival(req.params.eventId!, journalistId));
  }),
);

eventDayOfRouter.get(
  '/:eventId/journalists/:journalistId/badge',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    res.setHeader('Cache-Control', 'no-store');
    sendData(res, await buildJournalistBadge(req.params.eventId!, req.params.journalistId!));
  }),
);

eventDayOfRouter.post(
  '/:eventId/press-conferences/:conferenceId/check-in',
  validateBody(z.object({ journalistId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { journalistId } = req.body as { journalistId: string };
    sendData(
      res,
      await checkInConference(req.params.eventId!, req.params.conferenceId!, journalistId),
    );
  }),
);
