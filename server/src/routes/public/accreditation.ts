import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { getEventOrThrow, isRegistrationClosed } from '../../services/eventService';
import { getBranding, listMediaTypes } from '../../db/repositories/eventRepo';
import { submitAccreditation } from '../../services/accreditationService';

export const publicAccreditationRouter = Router();

const LANG = z.enum(['fr', 'en', 'pt', 'es']);

/** Données publiques nécessaires au formulaire d'accréditation (multilingue). */
publicAccreditationRouter.get(
  '/events/:eventId',
  asyncHandler(async (req, res) => {
    const event = await getEventOrThrow(req.params.eventId!);
    const [mediaTypes, branding] = await Promise.all([
      listMediaTypes(event.id),
      getBranding(event.id),
    ]);
    sendData(res, {
      id: event.id,
      name: event.name,
      location: event.location,
      languages: event.languages,
      mediaTypes: mediaTypes.map((m) => ({ id: m.id, label: m.label })),
      branding,
      registrationClosed: isRegistrationClosed(event, Date.now()),
      deadline: event.accreditationDeadline,
    });
  }),
);

// Minimum requis par le PRD : prénom, email, consentement.
const AccreditationSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().nullish(),
  email: z.string().email('Email invalide'),
  phone: z.string().nullish(),
  media: z.string().nullish(),
  mediaTypeId: z.string().uuid().nullish(),
  audience: z.string().nullish(),
  prevArticle: z.string().nullish(),
  lang: LANG.default('fr'),
  accreditationType: z.enum(['presse', 'photo', 'video']).nullish(),
  commitPublish: z.boolean().default(false),
  consent: z.literal(true, { errorMap: () => ({ message: 'Le consentement RGPD est obligatoire' }) }),
});

publicAccreditationRouter.post(
  '/events/:eventId/accreditations',
  validateBody(AccreditationSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof AccreditationSchema>;
    const journalist = await submitAccreditation({ eventId: req.params.eventId!, ...body });
    // On ne renvoie pas le token (non encore généré) ; juste l'accusé de réception.
    sendData(
      res,
      { id: journalist.id, accStatus: journalist.accStatus, message: 'Demande enregistrée' },
      201,
    );
  }),
);
