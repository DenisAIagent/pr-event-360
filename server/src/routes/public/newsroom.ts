import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { getEventOrThrow, isRegistrationClosed } from '../../services/eventService';
import { getBranding } from '../../db/repositories/eventRepo';
import { listAssets } from '../../db/repositories/assetRepo';
import { listPublishedPressReleases } from '../../db/repositories/pressReleaseRepo';

export const publicNewsroomRouter = Router();

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
