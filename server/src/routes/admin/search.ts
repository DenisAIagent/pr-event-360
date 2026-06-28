import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth } from '../../middleware/auth';
import { globalSearch } from '../../services/searchService';

export const searchRouter = Router();
searchRouter.use(requireAuth);

/**
 * Recherche globale du header (journalistes + événements), limitée aux événements
 * accessibles à l'utilisateur. Renvoie un résultat vide en deçà de 2 caractères.
 */
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      sendData(res, { journalists: [], events: [] });
      return;
    }
    sendData(res, await globalSearch(req.user!, q));
  }),
);
