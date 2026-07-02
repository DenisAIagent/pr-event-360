import { createHash } from 'node:crypto';
import { AppError } from '../http/AppError';
import { getStorageSettings } from './settingsService';

/**
 * Formats autorisés à l'upload (signés → Cloudinary rejette tout autre format côté
 * serveur, non contournable par le client sans casser la signature). Volontairement
 * restreint aux médias attendus : images, vidéos, PDF. Exclut notamment SVG/HTML/JS
 * (vecteurs XSS) et exécutables.
 */
export const ALLOWED_UPLOAD_FORMATS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', // images
  'mp4', 'mov', 'webm', 'm4v', // vidéos
  'pdf', // dossier de presse
] as const;

const ALLOWED_FORMATS_PARAM = ALLOWED_UPLOAD_FORMATS.join(',');

/** Plafond de taille par fichier (200 Mo) : borne le coût/abus de stockage. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  uploadUrl: string;
  /** Plafond de taille exposé au client pour un pré-contrôle (l'enregistrement le revalide). */
  maxBytes: number;
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
 * de vie courte (le timestamp). On scope chaque événement dans son propre dossier,
 * et on borne les formats acceptés (paramètre signé, imposé côté Cloudinary).
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
  // allowed_formats vient avant folder avant timestamp (ordre alphabétique).
  const toSign = `allowed_formats=${ALLOWED_FORMATS_PARAM}&folder=${folder}&timestamp=${nowSec}`;
  const signature = createHash('sha1').update(toSign + s.apiSecret).digest('hex');

  return {
    cloudName: s.cloudName,
    apiKey: s.apiKey,
    timestamp: nowSec,
    folder,
    allowedFormats: ALLOWED_FORMATS_PARAM,
    signature,
    maxBytes: MAX_UPLOAD_BYTES,
    // `auto` : Cloudinary détecte image / vidéo / fichier brut.
    uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`,
  };
}
