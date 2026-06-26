import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { getSettingsStatus, setSecrets } from '../../services/settingsService';

export const settingsRouter = Router();

// Réglages d'intégration (clés API) : réservés aux administrateurs.
settingsRouter.use(requireAuth, requireRole('admin'));

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await getSettingsStatus());
  }),
);

// Carte clé→valeur. Valeur vide = suppression de la surcharge (retour au .env).
const UpdateSchema = z.record(z.string(), z.string());
settingsRouter.put(
  '/',
  validateBody(UpdateSchema),
  asyncHandler(async (req, res) => {
    await setSecrets(req.body as Record<string, string>, req.user!.sub);
    sendData(res, await getSettingsStatus());
  }),
);
