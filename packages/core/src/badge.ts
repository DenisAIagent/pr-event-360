/**
 * Construction du document HTML d'un badge journaliste (fenêtre d'impression).
 *
 * Pur et sans DOM : le rendu est ici pour être testé côté `core` et partagé par
 * l'admin comme par l'espace public, qui l'ouvrent tous deux dans une fenêtre.
 *
 * Sécurité — pourquoi cette fonction existe :
 * le nom, le média et le nom d'événement proviennent du formulaire public
 * d'accréditation (validé en longueur seulement). Injectés bruts dans un
 * `document.write`, ils permettaient une XSS stockée same-origin (X-01/X-02) :
 * la fenêtre est un `about:blank` qui hérite de l'origine de l'application et
 * n'est PAS couverte par la CSP d'en-tête. On corrige à la source (encodage de
 * sortie) et on verrouille le document lui-même :
 *   - chaque valeur passe par `escapeHtml` ;
 *   - une balise `<meta>` CSP interdit toute exécution (`default-src 'none'`),
 *     n'autorisant que les images `data:` (le QR) et le style inline ;
 *   - AUCUN `<script>` inline : l'impression est déclenchée par la fenêtre
 *     ouvrante (voir `printBadge` côté client), jamais par le document.
 */

/** Échappe les caractères qui ouvriraient une balise ou casseraient un attribut double-quote. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface BadgeContent {
  /** Nom complet du journaliste (déjà assemblé prénom + nom). */
  name: string;
  /** Nom de l'événement. */
  eventName: string;
  /** Média représenté, ou null si non renseigné. */
  media: string | null;
  /** QR de check-in, en `data:` URL produite côté serveur par la lib `qrcode`. */
  qrDataUrl: string;
  /** Consigne d'impression affichée sous le QR (déjà traduite par l'appelant). */
  printHint: string;
  /** Titre de l'onglet ; par défaut le nom. */
  title?: string;
}

/** CSP du document badge : rien n'est chargé ni exécuté, hormis l'image `data:` du QR. */
export const BADGE_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'";

const BADGE_STYLES =
  'body{font-family:system-ui,sans-serif;text-align:center;padding:24px}' +
  'img{width:240px;height:240px}h1{font-size:18px;margin:12px 0 4px}' +
  '.m{color:#666;font-size:13px}';

/** Assemble le document HTML complet du badge, toutes valeurs échappées. */
export function buildBadgeHtml(badge: BadgeContent): string {
  const name = escapeHtml(badge.name);
  const eventName = escapeHtml(badge.eventName);
  const media = escapeHtml(badge.media ?? '');
  const qr = escapeHtml(badge.qrDataUrl);
  const hint = escapeHtml(badge.printHint);
  const title = escapeHtml(badge.title ?? badge.name);
  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>` +
    `<meta http-equiv="Content-Security-Policy" content="${BADGE_CSP}"/>` +
    `<title>${title}</title><style>${BADGE_STYLES}</style></head><body>` +
    `<div class="m">${eventName}</div>` +
    `<h1>${name}</h1>` +
    `<div class="m">${media}</div>` +
    `<img src="${qr}" alt="QR check-in"/>` +
    `<p class="m">${hint}</p>` +
    `</body></html>`
  );
}
