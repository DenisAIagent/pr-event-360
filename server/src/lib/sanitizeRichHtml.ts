import sanitizeHtml from 'sanitize-html';

/**
 * Assainit le HTML riche saisi par un RP (communiqués, newsletters) avant stockage/diffusion.
 * Allowlist stricte : structure éditoriale + liens/images https uniquement.
 * Supprime <script>, <style>, gestionnaires d'événements (onload…), et schémas
 * dangereux (javascript:, data:) — neutralise le XSS stocké à la source.
 * Seule iframe tolérée : le lecteur YouTube « privacy-enhanced » (vidéos dans les CP) ;
 * tout autre hôte est supprimé. La CSP frame-src fait la seconde ligne de défense.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
    'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen', 'referrerpolicy'],
    '*': ['align'],
  },
  // Liens et images : https et mailto/tel uniquement (pas de javascript:/data:).
  allowedSchemes: ['https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https'], iframe: ['https'] },
  allowedIframeHostnames: ['www.youtube-nocookie.com'],
  // allowedIframeHostnames vide le src des hôtes refusés mais laisse la balise :
  // on supprime toute iframe restée sans src (coquille vide inutile).
  exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs.src,
  allowProtocolRelative: false,
  // Force des liens externes sûrs. Iframes : le player YouTube exige un Referer
  // (erreur 153 sinon) or la page envoie Referrer-Policy: no-referrer — on force
  // l'attribut qui ne transmet que l'origine (couvre aussi les contenus déjà stockés,
  // le HTML étant ré-assaini à la lecture).
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
    iframe: sanitizeHtml.simpleTransform('iframe', { referrerpolicy: 'strict-origin-when-cross-origin' }),
  },
  // Pas de styles inline (vecteur d'UI-redress / phishing par overlay).
  allowedStyles: {},
};

export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
