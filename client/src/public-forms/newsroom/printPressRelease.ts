function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ouvre une fenêtre d'impression mise en page du communiqué que l'utilisateur enregistre
 * en PDF (logo + accent de l'événement, image, titre, date, corps). Même approche que
 * `admin/lib/printRequests.ts` — aucune dépendance serveur.
 */
export function printPressRelease(opts: {
  eventName: string;
  title: string;
  dateLabel: string | null;
  bodyHtml: string;
  coverImageUrl?: string | null;
  branding?: { logoUrl?: string | null; accentColor?: string | null } | null;
}): void {
  const accent = /^#[0-9a-fA-F]{6}$/.test(opts.branding?.accentColor ?? '')
    ? opts.branding!.accentColor!
    : '#1598d3';
  const logo = opts.branding?.logoUrl
    ? `<img src="${escapeHtml(opts.branding.logoUrl)}" alt="" class="logo" />`
    : `<strong class="wordmark">${escapeHtml(opts.eventName)}</strong>`;
  const cover = opts.coverImageUrl
    ? `<img src="${escapeHtml(opts.coverImageUrl)}" alt="" class="cover" />`
    : '';

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'" />
  <title>${escapeHtml(opts.title)} — ${escapeHtml(opts.eventName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 24px; font-size: 13px; line-height: 1.6; }
    header { border-bottom: 3px solid ${accent}; padding-bottom: 10px; margin-bottom: 18px;
             display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .logo { max-height: 52px; max-width: 200px; object-fit: contain; }
    .wordmark { font-size: 18px; }
    .kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${accent}; font-family: Arial, sans-serif; }
    h1 { font-size: 24px; margin: 6px 0 2px; line-height: 1.25; }
    .date { color: #666; font-size: 12px; font-family: Arial, sans-serif; margin-bottom: 16px; }
    .cover { width: 100%; max-height: 320px; object-fit: cover; border-radius: 6px; margin: 0 0 18px; }
    .body :is(h1,h2,h3) { font-family: Arial, sans-serif; line-height: 1.3; }
    .body img { max-width: 100%; height: auto; }
    .body a { color: ${accent}; }
    footer { margin-top: 26px; border-top: 1px solid #ddd; padding-top: 10px; color: #888;
             font-size: 11px; font-family: Arial, sans-serif; }
    @media print { body { margin: 14mm; } a { color: #1a1a1a; } }
  </style></head>
  <body>
    <header>${logo}<span class="kicker">Communiqué de presse</span></header>
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.dateLabel ? `<div class="date">${escapeHtml(opts.dateLabel)}</div>` : ''}
    ${cover}
    <div class="body">${opts.bodyHtml}</div>
    <footer>${escapeHtml(opts.eventName)} — Service de presse</footer>
    <script>window.onload = function () { window.focus(); window.print(); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
