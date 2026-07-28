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

/** Oublie la validation mise en cache (après modification des réglages). */
export function resetPresetValidationCache(): void {
  validatedPreset = null;
}

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

export interface StorageCheck {
  id: string;
  label: string;
  status: 'ok' | 'failed' | 'skipped';
  detail: string;
}

/** Authentification Admin API Cloudinary (clé publique + secret, jamais exposée au client). */
function adminAuthHeader(apiKey: string, apiSecret: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
}

/**
 * Diagnostic complet de la configuration Cloudinary, destiné au bouton « Tester la
 * connexion » du back-office. Contrairement à `signUpload`, ne lève pas à la première
 * erreur : chaque contrainte est évaluée séparément pour dire précisément CE QUI cloche.
 * Aucun secret n'apparaît dans les messages renvoyés.
 */
export async function checkStorageConfiguration(): Promise<{ ok: boolean; checks: StorageCheck[] }> {
  const s = await getStorageSettings();
  const checks: StorageCheck[] = [];
  const skipRest = (reason: string): { ok: boolean; checks: StorageCheck[] } => {
    for (const [id, label] of [
      ['credentials', 'Clés API acceptées par Cloudinary'],
      ['preset', 'Preset d’upload trouvé'],
      ['preset-signed', 'Preset en mode « Signed »'],
      ['preset-size', 'Plafond de taille conforme (≤ 200 Mio)'],
    ] as const) {
      if (!checks.some((c) => c.id === id)) checks.push({ id, label, status: 'skipped', detail: reason });
    }
    return { ok: false, checks };
  };

  // 1. Complétude de la configuration.
  const missing = (
    [
      ['CLOUDINARY_CLOUD_NAME', s.cloudName],
      ['CLOUDINARY_API_KEY', s.apiKey],
      ['CLOUDINARY_API_SECRET', s.apiSecret],
      ['CLOUDINARY_UPLOAD_PRESET', s.uploadPreset],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    checks.push({
      id: 'config',
      label: 'Configuration complète',
      status: 'failed',
      detail: `Valeur(s) manquante(s) : ${missing.join(', ')}.`,
    });
    return skipRest('Configuration incomplète.');
  }
  checks.push({
    id: 'config',
    label: 'Configuration complète',
    status: 'ok',
    detail: 'Les quatre valeurs sont renseignées.',
  });

  const cloudName = s.cloudName!;
  const auth = adminAuthHeader(s.apiKey!, s.apiSecret!);

  // 2. Les identifiants sont-ils acceptés ? (Admin API « ping »)
  try {
    const ping = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/ping`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(5_000),
    });
    if (ping.status === 401 || ping.status === 403) {
      checks.push({
        id: 'credentials',
        label: 'Clés API acceptées par Cloudinary',
        status: 'failed',
        detail: 'Cloudinary refuse ces identifiants. Vérifiez l’API Key et l’API Secret.',
      });
      return skipRest('Identifiants refusés.');
    }
    if (!ping.ok) {
      checks.push({
        id: 'credentials',
        label: 'Clés API acceptées par Cloudinary',
        status: 'failed',
        detail: `Cloudinary a répondu ${ping.status}. Vérifiez le Cloud name.`,
      });
      return skipRest('Compte injoignable.');
    }
    checks.push({
      id: 'credentials',
      label: 'Clés API acceptées par Cloudinary',
      status: 'ok',
      detail: `Compte « ${cloudName} » joignable.`,
    });
  } catch {
    checks.push({
      id: 'credentials',
      label: 'Clés API acceptées par Cloudinary',
      status: 'failed',
      detail: 'Cloudinary injoignable (délai dépassé ou réseau bloqué).',
    });
    return skipRest('Cloudinary injoignable.');
  }

  // 3/4/5. Le preset existe-t-il, est-il signé, et borne-t-il la taille ?
  let preset: { unsigned?: boolean; settings?: { max_file_size?: number | string } };
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}` +
        `/upload_presets/${encodeURIComponent(s.uploadPreset!)}`,
      { headers: { Authorization: auth }, signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) {
      checks.push({
        id: 'preset',
        label: 'Preset d’upload trouvé',
        status: 'failed',
        detail: `Aucun preset nommé « ${s.uploadPreset} » (réponse ${response.status}). Créez-le dans Settings → Upload.`,
      });
      return skipRest('Preset introuvable.');
    }
    preset = (await response.json()) as typeof preset;
  } catch {
    checks.push({
      id: 'preset',
      label: 'Preset d’upload trouvé',
      status: 'failed',
      detail: 'Lecture du preset impossible (délai dépassé).',
    });
    return skipRest('Preset illisible.');
  }
  checks.push({
    id: 'preset',
    label: 'Preset d’upload trouvé',
    status: 'ok',
    detail: `Preset « ${s.uploadPreset} » trouvé.`,
  });

  checks.push(
    preset.unsigned
      ? {
          id: 'preset-signed',
          label: 'Preset en mode « Signed »',
          status: 'failed',
          detail:
            'Le preset est en mode « Unsigned » : n’importe qui pourrait y déposer des fichiers. Basculez-le sur « Signed ».',
        }
      : {
          id: 'preset-signed',
          label: 'Preset en mode « Signed »',
          status: 'ok',
          detail: 'Seules les signatures émises par le serveur sont acceptées.',
        },
  );

  const maxFileSize = Number(preset.settings?.max_file_size);
  const sizeOk = Number.isFinite(maxFileSize) && maxFileSize > 0 && maxFileSize <= MAX_UPLOAD_BYTES;
  checks.push({
    id: 'preset-size',
    label: 'Plafond de taille conforme (≤ 200 Mio)',
    status: sizeOk ? 'ok' : 'failed',
    detail: sizeOk
      ? `Max file size : ${Math.round(maxFileSize / 1024 / 1024)} Mio.`
      : `Le preset doit définir un Max file size compris entre 1 et ${MAX_UPLOAD_BYTES} octets (200 Mio). Valeur actuelle : ${preset.settings?.max_file_size ?? 'non définie'}.`,
  });

  const ok = checks.every((c) => c.status === 'ok');
  // Un diagnostic réussi vaut validation : les envois suivants ne re-testent pas le preset.
  if (ok) validatedPreset = { key: `${cloudName}:${s.apiKey}:${s.uploadPreset}`, expiresAt: Date.now() + 60_000 };
  else validatedPreset = null;
  return { ok, checks };
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
