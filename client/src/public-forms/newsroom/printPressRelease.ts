import { escapeHtml, printBrandedDocument, resolveAccent } from '../../lib/printDocument';

/**
 * Ouvre une fenêtre d'impression mise en page du communiqué que l'utilisateur
 * enregistre en PDF (logo + accent de l'événement, image, titre, date, corps).
 *
 * La coquille vient de `lib/printDocument` : identité de l'événement, marges
 * gérées par le document (donc pas de mentions ajoutées par le navigateur),
 * attente du chargement des images, et impression pilotée par l'ouvrant — le
 * corps du communiqué étant du HTML rédigé par l'utilisateur, le document
 * interdit toute exécution de script.
 */
export function printPressRelease(opts: {
  eventName: string;
  title: string;
  dateLabel: string | null;
  bodyHtml: string;
  coverImageUrl?: string | null;
  branding?: { logoUrl?: string | null; accentColor?: string | null } | null;
}): void {
  // Accent par défaut du communiqué : le bleu de la marque, pas l'indigo des
  // exports internes — c'est une pièce diffusée à la presse.
  const accent = opts.branding?.accentColor
    ? resolveAccent(opts.branding)
    : '#1598d3';
  const cover = opts.coverImageUrl
    ? `<img src="${escapeHtml(opts.coverImageUrl)}" alt="" class="cover" />`
    : '';
  // Sans logo, le nom de l'événement tient lieu de signature dans l'en-tête.
  const wordmark = opts.branding?.logoUrl
    ? ''
    : `<strong class="wordmark">${escapeHtml(opts.eventName)}</strong>`;

  printBrandedDocument({
    title: `${opts.title} — ${opts.eventName}`,
    branding: { logoUrl: opts.branding?.logoUrl ?? null, accentColor: accent },
    heading: opts.title,
    subtitle: opts.dateLabel ?? undefined,
    footerLeft: opts.eventName,
    footerRight: 'Service de presse',
    styles: `
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.6; }
      .doc-header { justify-content: space-between; }
      .doc-title { font-size: 24px; line-height: 1.25; font-family: Georgia, 'Times New Roman', serif; }
      .doc-sub { font-family: Arial, sans-serif; font-size: 12px; }
      .wordmark { font-size: 18px; }
      .kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
                color: ${accent}; font-family: Arial, sans-serif; }
      .cover { width: 100%; max-height: 320px; object-fit: cover; border-radius: 6px; margin: 0 0 18px; }
      .body :is(h1,h2,h3) { font-family: Arial, sans-serif; line-height: 1.3; }
      .body img { max-width: 100%; height: auto; }
      .body a { color: ${accent}; }
      @media print { a { color: #1a1a1a; } }
    `,
    body: `${wordmark}<span class="kicker">Communiqué de presse</span>${cover}
      <div class="body">${opts.bodyHtml}</div>`,
  });
}
