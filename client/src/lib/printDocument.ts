/**
 * Base commune des documents imprimables (exports PDF des demandes, du bilan et
 * des communiqués). Trois problèmes y sont traités une fois pour toutes :
 *
 * 1. **En-tête et pied du navigateur.** Sans règle `@page`, Chrome imprime ses
 *    propres mentions dans les marges : date, titre de l'onglet, URL, pagination.
 *    Comme la fenêtre d'impression est un `about:blank` alimenté par
 *    `document.write`, le titre affiché peut être celui d'un autre onglet — d'où
 *    des textes parasites sur un document censé être à l'image du client.
 *    `@page { margin: 0 }` les supprime ; les marges sont reprises en padding.
 * 2. **Logo non peint.** `window.onload` ne garantit pas que les images d'un
 *    document écrit dynamiquement soient chargées : le PDF partait sans logo.
 *    On attend explicitement les images, avec un garde-fou pour qu'un logo
 *    injoignable ne bloque jamais l'impression.
 * 3. **Identité de l'événement.** Couleur d'accent validée et pied de page
 *    répété sur chaque feuille, pour que le document reste identifiable.
 */

export interface PrintBranding {
  logoUrl?: string | null;
  accentColor?: string | null;
}

/** Accent du client si c'est bien un `#RRGGBB`, sinon l'indigo par défaut. */
export function resolveAccent(branding?: PrintBranding | null): string {
  const value = branding?.accentColor ?? '';
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#4f46e5';
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Balise du logo de l'événement, ou chaîne vide si aucun logo n'est configuré.
 * `onerror` retire l'image : une URL morte laisse un en-tête propre plutôt que
 * l'icône d'image cassée du navigateur.
 */
export function brandLogo(branding?: PrintBranding | null, className = 'brand-logo'): string {
  const url = branding?.logoUrl;
  if (!url) return '';
  return `<img src="${escapeHtml(url)}" alt="" class="${className}" onerror="this.remove()" />`;
}

/** Marges de page, appliquées en padding puisque `@page` est à zéro. */
const PAGE_PADDING = '14mm 12mm 20mm';

function shellStyles(accent: string): string {
  return `
    /* Marges à zéro : supprime les en-tête/pied automatiques du navigateur. */
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      padding: ${PAGE_PADDING};
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      font-size: 12px;
    }
    .doc-header {
      display: flex; align-items: center; gap: 16px;
      border-bottom: 3px solid ${accent};
      padding-bottom: 10px; margin-bottom: 16px;
    }
    .brand-logo { max-height: 48px; max-width: 180px; object-fit: contain; }
    .doc-title { font-size: 18px; margin: 0; }
    .doc-sub { color: #666; font-size: 11px; margin-top: 2px; }
    /* Un élément fixe se répète sur chaque feuille à l'impression. */
    .doc-footer {
      position: fixed; left: 12mm; right: 12mm; bottom: 8mm;
      display: flex; justify-content: space-between; gap: 12px;
      border-top: 1px solid #e3e3e3; padding-top: 4px;
      font-size: 9px; color: #888;
    }
    .doc-footer strong { color: ${accent}; font-weight: 600; }
  `;
}

/** Délai au-delà duquel on imprime même si une image n'est pas revenue. */
const IMAGE_WAIT_MS = 3000;

/**
 * Déclenche l'impression depuis la fenêtre APPELANTE plutôt que par un script
 * inline dans le document. Deux raisons : le document imprimé peut porter un
 * `script-src 'none'` (le corps d'un communiqué est du HTML rédigé par
 * l'utilisateur), qui bloquerait un script inline ; et l'ouvrant peut observer
 * le chargement des images de la fenêtre fille, même origine.
 *
 * Le garde-fou couvre un logo distant injoignable : mieux vaut un PDF sans logo
 * qu'une fenêtre qui ne s'imprime jamais.
 */
function printWhenReady(w: Window): void {
  const startedAt = Date.now();
  const attempt = () => {
    if (w.closed) return;
    try {
      const waiting = Array.from(w.document.images).some((img) => !img.complete);
      if (waiting && Date.now() - startedAt < IMAGE_WAIT_MS) {
        window.setTimeout(attempt, 100);
        return;
      }
      w.focus();
      w.print();
    } catch {
      /* fenêtre fermée ou inaccessible pendant l'attente : rien à imprimer */
    }
  };
  window.setTimeout(attempt, 60);
}

/**
 * Assemble et ouvre le document. Renvoie `false` si la fenêtre a été bloquée,
 * pour que l'appelant puisse prévenir l'utilisateur.
 */
export function printBrandedDocument(opts: {
  /** Titre du document (onglet). */
  title: string;
  branding?: PrintBranding | null;
  /** En-tête : titre affiché et sous-titre (date d'édition…). */
  heading: string;
  subtitle?: string;
  /** CSS propre au document. */
  styles?: string;
  /** Corps du document (déjà échappé par l'appelant). */
  body: string;
  /** Pied répété sur chaque feuille — nom de l'événement par défaut. */
  footerLeft: string;
  footerRight?: string;
}): boolean {
  const accent = resolveAccent(opts.branding);
  // Aucun script n'est nécessaire (l'impression est pilotée par l'ouvrant) :
  // le document peut donc interdire toute exécution. Les images restent
  // autorisées pour le logo de l'événement et les visuels des communiqués.
  // `http:` doit rester autorisé : en développement l'app est servie en clair,
  // et un logo bloqué produirait un PDF sans identité. Les images ne sont pas un
  // vecteur d'exécution ici — scripts, objets et cadres restent interdits.
  const csp = "default-src 'none'; img-src http: https: data: blob:; style-src 'unsafe-inline'";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>${escapeHtml(opts.title)}</title>
  <style>${shellStyles(accent)}${opts.styles ?? ''}</style></head>
  <body>
    <header class="doc-header">
      ${brandLogo(opts.branding)}
      <div>
        <h1 class="doc-title">${escapeHtml(opts.heading)}</h1>
        ${opts.subtitle ? `<div class="doc-sub">${escapeHtml(opts.subtitle)}</div>` : ''}
      </div>
    </header>
    ${opts.body}
    <footer class="doc-footer">
      <span><strong>${escapeHtml(opts.footerLeft)}</strong></span>
      ${opts.footerRight ? `<span>${escapeHtml(opts.footerRight)}</span>` : ''}
    </footer>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  printWhenReady(w);
  return true;
}
