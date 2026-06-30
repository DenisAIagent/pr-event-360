import sanitizeHtml from 'sanitize-html';

/**
 * Assainit le HTML riche saisi par un RP (communiqués, newsletters) avant stockage/diffusion.
 * Allowlist stricte : structure éditoriale + liens/images https uniquement.
 * Supprime <script>, <style>, gestionnaires d'événements (onload…), iframes, et schémas
 * dangereux (javascript:, data:) — neutralise le XSS stocké à la source.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['align'],
  },
  // Liens et images : https et mailto/tel uniquement (pas de javascript:/data:).
  allowedSchemes: ['https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  // Force des liens externes sûrs.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
  },
  // Pas de styles inline (vecteur d'UI-redress / phishing par overlay).
  allowedStyles: {},
};

export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
