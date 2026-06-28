import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { AppError } from '../../http/AppError';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { findJournalistByToken } from '../../db/repositories/journalistRepo';
import { getBranding } from '../../db/repositories/eventRepo';
import { getEventOrThrow } from '../../services/eventService';
import { getPublicLineup } from '../../services/lineupService';
import { listJournalistRequests, submitRequest } from '../../services/requestService';
import { setSpacePassword } from '../../services/journalistAuthService';

export const publicSpaceRouter = Router();

/**
 * Espace journaliste (accès par token). Renvoie son profil, le lineup pour le
 * sélecteur, et la liste de ses demandes avec statut. Chaque journaliste ne voit
 * que son propre espace.
 */
publicSpaceRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = req.params.token!;
    const journalist = await findJournalistByToken(token);
    if (!journalist) throw AppError.notFound('Espace introuvable');
    if (journalist.accStatus !== 'acceptee') {
      throw AppError.forbidden('Accréditation non encore acceptée');
    }
    const event = await getEventOrThrow(journalist.eventId);
    const [lineup, requests, branding] = await Promise.all([
      getPublicLineup(journalist.eventId, journalist.lang),
      listJournalistRequests(token),
      getBranding(journalist.eventId),
    ]);
    sendData(res, {
      event: { id: event.id, name: event.name, languages: event.languages, branding },
      journalist: {
        firstName: journalist.firstName,
        lastName: journalist.lastName,
        lang: journalist.lang,
        accreditationType: journalist.accreditationType,
        hasPassword: journalist.passwordHash != null,
      },
      lineup,
      requests,
    });
  }),
);

const RequestSchema = z
  .object({
    type: z.enum(['interview', 'photo_report', 'video_report']),
    artistId: z.string().uuid().nullish(),
    slotId: z.string().uuid().nullish(),
    stageId: z.string().uuid().nullish(),
    message: z.string().nullish(),
  })
  .refine((d) => !!d.artistId, {
    message: 'Un artiste est requis',
    path: ['artistId'],
  });

publicSpaceRouter.post(
  '/:token/requests',
  validateBody(RequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof RequestSchema>;
    const request = await submitRequest({ token: req.params.token!, ...body });
    sendData(res, request, 201);
  }),
);

const PasswordSchema = z.object({ password: z.string().min(8, 'Au moins 8 caractères') });

/** Le journaliste (authentifié par son token d'espace) définit/remplace son mot de passe. */
publicSpaceRouter.post(
  '/:token/password',
  validateBody(PasswordSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body as z.infer<typeof PasswordSchema>;
    await setSpacePassword(req.params.token!, password);
    sendData(res, { ok: true });
  }),
);
