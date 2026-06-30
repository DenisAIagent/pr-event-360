import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { getEventOrThrow, isRegistrationClosed } from '../../services/eventService';
import { AppError } from '../../http/AppError';
import { getBranding } from '../../db/repositories/eventRepo';
import { listAssets } from '../../db/repositories/assetRepo';
import { findPressReleaseBySlug, listPublishedPressReleases } from '../../db/repositories/pressReleaseRepo';

export const publicNewsroomRouter = Router();

/** Un communiqué précis (par slug), pour sa page dédiée. 404 si brouillon/introuvable. */
publicNewsroomRouter.get(
  '/:eventId/cp/:slug',
  asyncHandler(async (req, res) => {
    const eventId = req.params.eventId!;
    const event = await getEventOrThrow(eventId);
    const pr = await findPressReleaseBySlug(eventId, req.params.slug!);
    if (!pr || pr.status !== 'published') throw AppError.notFound('Communiqué introuvable');
    const branding = await getBranding(eventId);
    sendData(res, {
      event: { id: event.id, name: event.name, branding },
      pressRelease: pr,
    });
  }),
);

/**
 * Newsroom publique d'un événement : communiqués publiés + médias téléchargeables
 * (photos, vidéos, logos, dossier de presse). Lecture seule, accessible à tous.
 */
publicNewsroomRouter.get(
  '/:eventId',
  asyncHandler(async (req, res) => {
    const eventId = req.params.eventId!;
    const event = await getEventOrThrow(eventId);
    const [branding, assets, pressReleases] = await Promise.all([
      getBranding(eventId),
      listAssets(eventId),
      listPublishedPressReleases(eventId),
    ]);
    sendData(res, {
      event: {
        id: event.id,
        name: event.name,
        location: event.location,
        branding,
        deadline: event.accreditationDeadline,
        registrationClosed: isRegistrationClosed(event, Date.now()),
      },
      assets,
      pressReleases,
    });
  }),
);
