export interface PrintTableGroup {
  title: string;
  meta?: string;
  rows: string[][];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ouvre une fenêtre d'impression propre (table par groupe) que l'utilisateur
 * enregistre en PDF pour la remettre aux régisseurs. Générique : les colonnes et
 * les lignes sont fournies par l'appelant (file, par artiste/scène, planning…).
 * Saut de page évité à l'intérieur d'un groupe.
 */
export function printTable(opts: {
  eventName: string;
  heading: string;
  generatedAt: string;
  columns: string[];
  groups: PrintTableGroup[];
  branding?: { logoUrl?: string | null; accentColor?: string | null } | null;
}): void {
  const thead = `<tr>${opts.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
  // Couleur d'accent du branding (validée #RRGGBB) ou indigo par défaut.
  const accent = /^#[0-9a-fA-F]{6}$/.test(opts.branding?.accentColor ?? '')
    ? opts.branding!.accentColor!
    : '#4f46e5';
  const logo = opts.branding?.logoUrl
    ? `<img src="${escapeHtml(opts.branding.logoUrl)}" alt="" class="logo" />`
    : '';

  const sections = opts.groups
    .filter((g) => g.rows.length > 0)
    .map((g) => {
      const body = g.rows
        .map((cells) => `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<section class="grp">
        <h2>${escapeHtml(g.title)}${g.meta ? ` <span class="meta">${escapeHtml(g.meta)}</span>` : ''}</h2>
        <table><thead>${thead}</thead><tbody>${body}</tbody></table>
      </section>`;
    })
    .join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <title>${escapeHtml(opts.heading)} — ${escapeHtml(opts.eventName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 24px; font-size: 12px; }
    header { border-bottom: 3px solid ${accent}; padding-bottom: 10px; margin-bottom: 16px;
             display: flex; align-items: center; gap: 16px; }
    .logo { max-height: 48px; max-width: 180px; object-fit: contain; }
    h1 { font-size: 18px; margin: 0; }
    .sub { color: #666; font-size: 11px; margin-top: 2px; }
    .grp { margin-bottom: 18px; page-break-inside: avoid; }
    h2 { font-size: 14px; margin: 0 0 6px; border-left: 3px solid ${accent}; padding-left: 8px; }
    h2 .meta { font-size: 11px; color: #666; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555;
         border-bottom: 2px solid ${accent}; padding: 4px 6px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
    @media print { body { margin: 12mm; } }
  </style></head>
  <body>
    <header>
      ${logo}
      <div>
        <h1>${escapeHtml(opts.heading)} — ${escapeHtml(opts.eventName)}</h1>
        <div class="sub">Édité le ${escapeHtml(opts.generatedAt)}</div>
      </div>
    </header>
    ${sections || '<p>Aucune donnée à exporter.</p>'}
    <script>window.onload = function () { window.focus(); window.print(); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
