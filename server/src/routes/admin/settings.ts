import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { scopedRateLimit } from '../../middleware/rateLimit';
import { getSettingsStatus, setSecrets } from '../../services/settingsService';
import { checkStorageConfiguration, resetPresetValidationCache } from '../../services/storageService';

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
    // Le preset validé l'a été avec les anciennes clés : on repart d'une page blanche.
    resetPresetValidationCache();
    sendData(res, await getSettingsStatus());
  }),
);

// Diagnostic Cloudinary : appels sortants vers l'Admin API, donc plafonné.
const testLimiter = scopedRateLimit({
  windowMs: 60_000,
  limit: 10,
  message: 'Trop de tests consécutifs, patientez une minute.',
});

/**
 * Vérifie la configuration de stockage contrainte par contrainte et renvoie le détail.
 * Évite l'aller-retour « j'enregistre, je tente un upload, ça échoue, pourquoi ? ».
 */
settingsRouter.post(
  '/test/cloudinary',
  testLimiter,
  asyncHandler(async (_req, res) => {
    sendData(res, await checkStorageConfiguration());
  }),
);
