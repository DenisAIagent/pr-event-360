/**
 * Helpers YouTube : extraction d'ID depuis les URLs collées par les RP et
 * construction des URLs d'intégration (lecteur sans cookies) et de miniature.
 * Miroir de client/src/lib/youtube.ts — garder les deux synchronisés.
 */

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube-nocookie.com',
]);

/**
 * Extrait l'ID vidéo d'une URL YouTube (watch, youtu.be, Shorts, live, embed).
 * Renvoie null si l'URL n'est pas une vidéo YouTube reconnaissable.
 */
export function youtubeVideoId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

  const host = u.hostname.toLowerCase();
  const check = (id: string | null | undefined): string | null => (id && YT_ID.test(id) ? id : null);

  if (host === 'youtu.be') return check(u.pathname.split('/')[1]);
  if (!YT_HOSTS.has(host)) return null;

  const segments = u.pathname.split('/').filter(Boolean);
  if (segments[0] === 'watch') return check(u.searchParams.get('v'));
  if (segments[0] === 'shorts' || segments[0] === 'live' || segments[0] === 'embed') {
    return check(segments[1]);
  }
  return null;
}

/** URL du lecteur embarqué, variante « privacy-enhanced » (aucun cookie avant lecture). */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/** URL canonique de la page de la vidéo (lien « Voir sur YouTube »). */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Miniature haute qualité servie par YouTube (toujours disponible, 480×360). */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Bloc HTML d'intégration inséré dans le corps des communiqués.
 * referrerpolicy : le player YouTube exige un Referer (erreur 153 sinon) alors que
 * l'app envoie Referrer-Policy: no-referrer globalement — l'attribut ne transmet
 * que l'origine (jamais le chemin, donc jamais de token d'URL).
 */
export function youtubeEmbedHtml(videoId: string): string {
  return `<figure><iframe src="${youtubeEmbedUrl(videoId)}" title="Vidéo YouTube" width="560" height="315" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></figure>`;
}
