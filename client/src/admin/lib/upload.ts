import type { UploadSignature } from './types';

export interface UploadedFile {
  url: string;
  thumbnailUrl: string | null;
  mime: string;
  bytes: number;
}

/**
 * Upload direct vers Cloudinary avec une signature obtenue du serveur. Le fichier
 * ne transite pas par notre back-end (gros fichiers / vidéos OK).
 */
export async function uploadToCloudinary(file: File, sig: UploadSignature): Promise<UploadedFile> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('folder', sig.folder);
  form.append('signature', sig.signature);

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Échec de l'upload (${res.status}). ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    secure_url: string;
    resource_type: string;
    format?: string;
    bytes: number;
  };

  // Miniature : pour une vidéo, Cloudinary sert un poster en remplaçant l'extension.
  let thumbnailUrl: string | null = null;
  if (json.resource_type === 'image') {
    thumbnailUrl = json.secure_url;
  } else if (json.resource_type === 'video') {
    thumbnailUrl = json.secure_url.replace(/\.[a-z0-9]+$/i, '.jpg');
  }

  return {
    url: json.secure_url,
    thumbnailUrl,
    mime: `${json.resource_type}/${json.format ?? ''}`.replace(/\/$/, ''),
    bytes: json.bytes,
  };
}
