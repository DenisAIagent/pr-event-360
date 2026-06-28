import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { getSettingsStatus, setSecrets } from '../../services/settingsService';

export const settingsRouter = Router();

// Intégrations (clés API Brevo/Twilio/Cloudinary) = ressources PLATEFORME partagées :
// réservées au super-admin plateforme, invisibles des admins d'organisation.
settingsRouter.use(requireAuth, requirePlatformAdmin);

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
