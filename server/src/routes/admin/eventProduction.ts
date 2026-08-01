import { Router } from 'express';
import { z } from 'zod';
import { PRODUCTION_JOB_TITLES } from '@pr-event-360/core';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth, requireEventEditor } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { scopedRateLimit } from '../../middleware/rateLimit';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  createProductionContact,
  editProductionContact,
  getProductionContacts,
  removeProductionContact,
  sendProductionAccessLink,
} from '../../services/productionContactService';
import { countUnseenReviews, markReviewsSeen } from '../../db/repositories/productionRepo';

/**
 * Contacts production d'un événement : le back-office déclare qui représente
 * quels artistes et leur envoie un lien de validation.
 */
export const eventProductionRouter = Router();
eventProductionRouter.use(requireAuth);

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  jobTitle: z.enum(PRODUCTION_JOB_TITLES, {
    errorMap: () => ({ message: 'Fonction invalide — choisissez une valeur de la liste.' }),
  }),
  email: z.string().trim().email().max(320),
  artistIds: z.array(z.string().uuid()).max(200).default([]),
});

eventProductionRouter.get(
  '/:eventId/production-contacts',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getProductionContacts(req.params.eventId!));
  }),
);

eventProductionRouter.post(
  '/:eventId/production-contacts',
  requireEventEditor,
  validateBody(ContactSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ContactSchema>;
    sendData(res, await createProductionContact({ eventId: req.params.eventId!, ...body }), 201);
  }),
);

eventProductionRouter.put(
  '/:eventId/production-contacts/:contactId',
  requireEventEditor,
  validateBody(ContactSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ContactSchema>;
    sendData(
      res,
      await editProductionContact({
        contactId: req.params.contactId!,
        eventId: req.params.eventId!,
        ...body,
      }),
    );
  }),
);

eventProductionRouter.delete(
  '/:eventId/production-contacts/:contactId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await removeProductionContact(req.params.contactId!, req.params.eventId!);
    sendData(res, { ok: true });
  }),
);

// Chaque envoi tourne le jeton (l'ancien lien meurt) et déclenche un email réel.
// Même raisonnement que le renvoi de lien journaliste : on protège la boîte
// visée, d'où une clé par couple événement+contact plutôt que par IP.
const linkSendLimiter = scopedRateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  keyGenerator: (req) => `${req.params.eventId}:${req.params.contactId}`,
  skipFailedRequests: true,
  message: 'Trop d’envois pour ce contact. Réessayez dans une heure — le dernier lien envoyé reste valable.',
});

eventProductionRouter.post(
  '/:eventId/production-contacts/:contactId/send-link',
  requireEventEditor,
  linkSendLimiter,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await sendProductionAccessLink(req.params.contactId!, req.params.eventId!));
  }),
);

/**
 * Compteur d'avis nouveaux pour l'utilisateur courant. Le marqueur est par
 * couple utilisateur + événement : chaque membre a son propre compteur.
 */
eventProductionRouter.get(
  '/:eventId/reviews/unseen',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, { count: await countUnseenReviews(req.user!.sub, req.params.eventId!) });
  }),
);

/** Marque les avis comme consultés (appelé à l'ouverture de l'onglet Demandes). */
eventProductionRouter.post(
  '/:eventId/reviews/seen',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await markReviewsSeen(req.user!.sub, req.params.eventId!);
    sendData(res, { ok: true });
  }),
);
