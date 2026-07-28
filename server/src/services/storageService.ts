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
  uploadPreset: string;
  signature: string;
  uploadUrl: string;
  /** Plafond de taille exposé au client pour un pré-contrôle (l'enregistrement le revalide). */
  maxBytes: number;
}

/** Le stockage objet est-il configuré (3 clés Cloudinary présentes) ? */
export async function isStorageConfigured(): Promise<boolean> {
  const s = await getStorageSettings();
  return Boolean(s.cloudName && s.apiKey && s.apiSecret && s.uploadPreset);
}

let validatedPreset: { key: string; expiresAt: number } | null = null;

/** Vérifie côté fournisseur que le plafond n'est pas seulement une indication UI. */
async function requireSafeUploadPreset(s: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
}): Promise<void> {
  const key = `${s.cloudName}:${s.apiKey}:${s.uploadPreset}`;
  if (validatedPreset?.key === key && validatedPreset.expiresAt > Date.now()) return;
  const url =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(s.cloudName)}` +
    `/upload_presets/${encodeURIComponent(s.uploadPreset)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${s.apiKey}:${s.apiSecret}`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw AppError.badRequest("Impossible de vérifier le preset d'upload Cloudinary.");
  }
  if (!response.ok) throw AppError.badRequest("Preset d'upload Cloudinary introuvable ou inaccessible.");
  const preset = (await response.json()) as {
    unsigned?: boolean;
    settings?: { max_file_size?: number | string };
  };
  const maxFileSize = Number(preset.settings?.max_file_size);
  if (preset.unsigned || !Number.isFinite(maxFileSize) || maxFileSize <= 0 || maxFileSize > MAX_UPLOAD_BYTES) {
    throw AppError.badRequest(
      'Le preset Cloudinary doit être signé et imposer max_file_size <= 209715200 octets.',
    );
  }
  validatedPreset = { key, expiresAt: Date.now() + 60_000 };
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
  if (!s.cloudName || !s.apiKey || !s.apiSecret || !s.uploadPreset) {
    throw AppError.badRequest(
      'Stockage non configuré : renseignez les clés et le preset signé Cloudinary dans Intégrations.',
    );
  }
  await requireSafeUploadPreset(s as Required<typeof s>);
  const folder = `pr-event-360/${eventId}`;
  // Cloudinary : signer les paramètres triés alphabétiquement, suffixés du secret.
  // allowed_formats vient avant folder avant timestamp (ordre alphabétique).
  const toSign =
    `allowed_formats=${ALLOWED_FORMATS_PARAM}&folder=${folder}&timestamp=${nowSec}` +
    `&upload_preset=${s.uploadPreset}`;
  const signature = createHash('sha1').update(toSign + s.apiSecret).digest('hex');

  return {
    cloudName: s.cloudName,
    apiKey: s.apiKey,
    timestamp: nowSec,
    folder,
    allowedFormats: ALLOWED_FORMATS_PARAM,
    uploadPreset: s.uploadPreset,
    signature,
    maxBytes: MAX_UPLOAD_BYTES,
    // `auto` : Cloudinary détecte image / vidéo / fichier brut.
    uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`,
  };
}
