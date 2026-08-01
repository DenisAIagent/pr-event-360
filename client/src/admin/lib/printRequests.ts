import {
  escapeHtml,
  printBrandedDocument,
  resolveAccent,
  type PrintBranding,
} from '../../lib/printDocument';

export interface PrintTableGroup {
  title: string;
  meta?: string;
  rows: string[][];
}

/**
 * Ouvre une fenêtre d'impression propre (table par groupe) que l'utilisateur
 * enregistre en PDF pour la remettre aux régisseurs. Générique : les colonnes et
 * les lignes sont fournies par l'appelant (file, par artiste/scène, planning…).
 * Saut de page évité à l'intérieur d'un groupe.
 *
 * La coquille (identité de l'événement, suppression des mentions du navigateur,
 * attente du logo) vient de `lib/printDocument`.
 *
 * Renvoie `false` si la fenêtre d'impression a été bloquée par le navigateur.
 */
export function printTable(opts: {
  eventName: string;
  heading: string;
  generatedAt: string;
  columns: string[];
  groups: PrintTableGroup[];
  branding?: PrintBranding | null;
}): boolean {
  const accent = resolveAccent(opts.branding);
  const thead = `<tr>${opts.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;

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

  return printBrandedDocument({
    title: `${opts.heading} — ${opts.eventName}`,
    branding: opts.branding,
    heading: `${opts.heading} — ${opts.eventName}`,
    subtitle: `Édité le ${opts.generatedAt}`,
    footerLeft: opts.eventName,
    footerRight: `${opts.heading} · édité le ${opts.generatedAt}`,
    styles: `
      .grp { margin-bottom: 18px; page-break-inside: avoid; }
      h2 { font-size: 14px; margin: 0 0 6px; border-left: 3px solid ${accent}; padding-left: 8px; }
      h2 .meta { font-size: 11px; color: #666; font-weight: normal; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555;
           border-bottom: 2px solid ${accent}; padding: 4px 6px; }
      td { padding: 4px 6px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
    `,
    body: sections || '<p>Aucune donnée à exporter.</p>',
  });
}
