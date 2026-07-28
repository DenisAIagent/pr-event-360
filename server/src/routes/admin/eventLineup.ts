import { Router } from 'express';
import { z } from 'zod';
import {
  PRESS_CONFERENCE_REGISTRATION_MODES,
  PRESS_CONFERENCE_REGISTRATION_STATUSES,
  PRESS_CONFERENCE_STATUSES,
} from '@pr-event-360/core';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { AppError } from '../../http/AppError';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireEventEditor } from '../../middleware/auth';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import { addArtist, addStage, getLineup } from '../../services/lineupService';
import {
  updateArtist,
  deleteArtist,
  updateStage,
  deleteStage,
} from '../../db/repositories/lineupRepo';
import {
  createPressConference,
  editPressConference,
  getConferenceRegistrationsAdmin,
  inviteJournalists,
  listPressConferencesAdmin,
  removePressConference,
  setConferenceRegistrationStatus,
} from '../../services/pressConferenceService';

/**
 * Routeur « programmation » : lineup (scènes, artistes) et conférences de
 * presse. Monté sur /api/admin/events aux côtés du routeur cœur.
 */
export const eventLineupRouter = Router();
eventLineupRouter.use(requireAuth);

// ── Lineup ──────────────────────────────────────────────────────────
const StageSchema = z.object({ name: z.string().min(1) });
eventLineupRouter.post(
  '/:eventId/stages',
  requireEventEditor,
  validateBody(StageSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StageSchema>;
    sendData(res, await addStage(req.params.eventId!, body.name), 201);
  }),
);

eventLineupRouter.get(
  '/:eventId/lineup',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getLineup(req.params.eventId!));
  }),
);

const TIME = z.string().regex(/^\d{1,2}:\d{2}$/, 'Heure attendue HH:MM');
const ArtistSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().uuid().nullish(),
  itwQuota: z.number().int().nonnegative().nullish(),
  photoQuota: z.number().int().nonnegative().nullish(),
  videoQuota: z.number().int().nonnegative().nullish(),
  windows: z
    .array(z.object({ day: z.string().min(1), startTime: TIME, endTime: TIME }))
    .optional(),
});
eventLineupRouter.post(
  '/:eventId/artists',
  requireEventEditor,
  validateBody(ArtistSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ArtistSchema>;
    sendData(res, await addArtist({ eventId: req.params.eventId!, ...body }), 201);
  }),
);

// Corriger un artiste (nom, scène, quota). Les créneaux ne changent pas ici.
const ArtistUpdateSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().uuid().nullish(),
  itwQuota: z.number().int().nonnegative().nullish(),
  photoQuota: z.number().int().nonnegative().nullish(),
  videoQuota: z.number().int().nonnegative().nullish(),
});
eventLineupRouter.put(
  '/:eventId/artists/:artistId',
  requireEventEditor,
  validateBody(ArtistUpdateSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ArtistUpdateSchema>;
    const artist = await updateArtist(req.params.artistId!, req.params.eventId!, body);
    if (!artist) throw AppError.notFound('Participant introuvable.');
    sendData(res, artist);
  }),
);

eventLineupRouter.delete(
  '/:eventId/artists/:artistId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteArtist(req.params.artistId!, req.params.eventId!);
    sendData(res, { deleted: true });
  }),
);

// Renommer / supprimer une scène.
eventLineupRouter.put(
  '/:eventId/stages/:stageId',
  requireEventEditor,
  validateBody(StageSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StageSchema>;
    const stage = await updateStage(req.params.stageId!, req.params.eventId!, body.name);
    if (!stage) throw AppError.notFound('Espace introuvable.');
    sendData(res, stage);
  }),
);

eventLineupRouter.delete(
  '/:eventId/stages/:stageId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteStage(req.params.stageId!, req.params.eventId!);
    sendData(res, { deleted: true });
  }),
);

// ── Conférences de presse ──────────────────────────────────────────
const PressConferenceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullish(),
  venue: z.string().trim().max(300).nullish(),
  capacity: z.number().int().nonnegative().nullish(),
  registrationMode: z.enum(PRESS_CONFERENCE_REGISTRATION_MODES),
  status: z.enum(PRESS_CONFERENCE_STATUSES),
  allowedAccreditationTypes: z.array(z.enum(['presse', 'photo', 'video'])).min(1),
  embargoUntil: z.string().datetime().nullish(),
  livestreamUrl: z.string().url().max(2000).regex(/^https:\/\//i, 'URL https:// requise').nullish(),
  participantIds: z.array(z.string().uuid()).max(100).default([]),
});

eventLineupRouter.get(
  '/:eventId/press-conferences',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await listPressConferencesAdmin(req.params.eventId!));
  }),
);

eventLineupRouter.post(
  '/:eventId/press-conferences',
  requireEventEditor,
  validateBody(PressConferenceSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(
      res,
      await createPressConference(req.params.eventId!, req.body as z.infer<typeof PressConferenceSchema>),
      201,
    );
  }),
);

eventLineupRouter.put(
  '/:eventId/press-conferences/:conferenceId',
  requireEventEditor,
  validateBody(PressConferenceSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(
      res,
      await editPressConference(
        req.params.eventId!,
        req.params.conferenceId!,
        req.body as z.infer<typeof PressConferenceSchema>,
      ),
    );
  }),
);

eventLineupRouter.delete(
  '/:eventId/press-conferences/:conferenceId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await removePressConference(req.params.eventId!, req.params.conferenceId!);
    sendData(res, { deleted: true });
  }),
);

eventLineupRouter.get(
  '/:eventId/press-conferences/:conferenceId/registrations',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(
      res,
      await getConferenceRegistrationsAdmin(req.params.eventId!, req.params.conferenceId!),
    );
  }),
);

const ConferenceInviteSchema = z.object({ journalistIds: z.array(z.string().uuid()).min(1).max(500) });
eventLineupRouter.post(
  '/:eventId/press-conferences/:conferenceId/invitations',
  requireEventEditor,
  validateBody(ConferenceInviteSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { journalistIds } = req.body as z.infer<typeof ConferenceInviteSchema>;
    sendData(res, await inviteJournalists(req.params.eventId!, req.params.conferenceId!, journalistIds));
  }),
);

const ConferenceRegistrationStatusSchema = z.object({
  status: z.enum(PRESS_CONFERENCE_REGISTRATION_STATUSES),
});
eventLineupRouter.put(
  '/:eventId/press-conferences/:conferenceId/registrations/:journalistId',
  requireEventEditor,
  validateBody(ConferenceRegistrationStatusSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const { status } = req.body as z.infer<typeof ConferenceRegistrationStatusSchema>;
    sendData(
      res,
      await setConferenceRegistrationStatus(
        req.params.eventId!,
        req.params.conferenceId!,
        req.params.journalistId!,
        status,
      ),
    );
  }),
);
