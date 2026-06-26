import { createHash } from 'node:crypto';
import { AppError } from '../http/AppError';
import { getStorageSettings } from './settingsService';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

/** Le stockage objet est-il configuré (3 clés Cloudinary présentes) ? */
export async function isStorageConfigured(): Promise<boolean> {
  const s = await getStorageSettings();
  return Boolean(s.cloudName && s.apiKey && s.apiSecret);
}

/**
 * Génère une signature d'upload Cloudinary pour un upload DIRECT depuis le
 * navigateur (le fichier ne transite pas par notre serveur). La clé secrète
 * Cloudinary reste côté serveur ; le client ne reçoit qu'une signature à durée
 * de vie courte (le timestamp). On scope chaque événement dans son propre dossier.
 */
export async function signUpload(eventId: string, nowSec: number): Promise<UploadSignature> {
  const s = await getStorageSettings();
  if (!s.cloudName || !s.apiKey || !s.apiSecret) {
    throw AppError.badRequest(
      'Stockage non configuré : renseignez les clés Cloudinary dans Intégrations.',
    );
  }
  const folder = `pr-event-360/${eventId}`;
  // Cloudinary : signer les paramètres triés alphabétiquement, suffixés du secret.
  const toSign = `folder=${folder}&timestamp=${nowSec}`;
  const signature = createHash('sha1').update(toSign + s.apiSecret).digest('hex');

  return {
    cloudName: s.cloudName,
    apiKey: s.apiKey,
    timestamp: nowSec,
    folder,
    signature,
    // `auto` : Cloudinary détecte image / vidéo / fichier brut.
    uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`,
  };
}
