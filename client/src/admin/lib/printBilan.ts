/**
 * Bilan presse imprimable (Enregistrer en PDF via la boîte d'impression navigateur).
 */

export interface BilanPrintData {
  event: {
    id: string;
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    eventType: string;
  };
  branding: { logoUrl: string | null; accentColor: string | null } | null;
  generatedAt: string;
  kpis: {
    journalistsTotal: number;
    byAccStatus: Record<string, number>;
    byAccType: Record<string, number>;
    requestsTotal: number;
    byRequestStatus: Record<string, number>;
    byRequestType: Record<string, number>;
    coverageTotal: number;
    coverageByCategory: Record<string, number>;
    contributorsCount: number;
    pendingCoverageCount: number;
  };
  highlights: {
    topMedia: Array<{ name: string; count: number }>;
    topParticipants: Array<{ name: string; count: number }>;
  };
}

const ACC_STATUS: Record<string, string> = {
  pas_encore_traite: 'En attente',
  acceptee: 'Acceptées',
  refusee: 'Refusées',
};
const ACC_TYPE: Record<string, string> = {
  presse: 'Journalistes',
  photo: 'Photographes',
  video: 'Vidéastes',
};
const REQ_TYPE: Record<string, string> = {
  interview: 'Interviews',
  photo_report: 'Reportages photo',
  video_report: 'Reportages vidéo',
};
const REQ_STATUS: Record<string, string> = {
  pas_encore_traite: 'Pas encore traitées',
  en_cours: 'En cours',
  transmise_prod: 'Transmises prod',
  attente_artiste: 'Attente artiste',
  acceptee: 'Acceptées',
  refusee: 'Refusées',
  liste_attente: "Liste d'attente",
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function kvTable(title: string, map: Record<string, number>, labels: Record<string, string>): string {
  const rows = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) =>
        `<tr><td>${esc(labels[k] ?? k)}</td><td class="num">${v}</td></tr>`,
    )
    .join('');
  if (!rows) return '';
  return `<section class="block"><h2>${esc(title)}</h2>
    <table><tbody>${rows}</tbody></table></section>`;
}

function rankTable(title: string, items: Array<{ name: string; count: number }>): string {
  if (!items.length) return '';
  const rows = items
    .map((i, idx) => `<tr><td class="num">${idx + 1}</td><td>${esc(i.name)}</td><td class="num">${i.count}</td></tr>`)
    .join('');
  return `<section class="block"><h2>${esc(title)}</h2>
    <table><thead><tr><th>#</th><th>Nom</th><th>Nb</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

/** Ouvre une fenêtre d'impression du bilan presse. */
export function printBilan(data: BilanPrintData): void {
  const accent = /^#[0-9a-fA-F]{6}$/.test(data.branding?.accentColor ?? '')
    ? data.branding!.accentColor!
    : '#4f46e5';
  const logo = data.branding?.logoUrl
    ? `<img src="${esc(data.branding.logoUrl)}" alt="" class="logo" />`
    : '';
  const generated = new Date(data.generatedAt).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const period =
    data.event.startDate || data.event.endDate
      ? `${formatDate(data.event.startDate)} → ${formatDate(data.event.endDate)}`
      : 'Dates non renseignées';

  const k = data.kpis;
  const cards = [
    ['Accréditations', k.journalistsTotal],
    ['Demandes', k.requestsTotal],
    ['Retombées', k.coverageTotal],
    ['Contributeurs', k.contributorsCount],
    ['Sans retombée', k.pendingCoverageCount],
  ]
    .map(
      ([label, value]) =>
        `<div class="card"><div class="val">${value}</div><div class="lbl">${esc(String(label))}</div></div>`,
    )
    .join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <title>Bilan presse — ${esc(data.event.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 24px; font-size: 12px; }
    header { border-bottom: 3px solid ${accent}; padding-bottom: 12px; margin-bottom: 20px;
             display: flex; align-items: center; gap: 16px; }
    .logo { max-height: 52px; max-width: 180px; object-fit: contain; }
    h1 { font-size: 20px; margin: 0; }
    .sub { color: #666; font-size: 11px; margin-top: 4px; }
    .cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
    .card { border: 1px solid #e3e3e3; border-radius: 8px; padding: 12px 16px; min-width: 110px;
            border-top: 3px solid ${accent}; }
    .card .val { font-size: 22px; font-weight: 700; color: ${accent}; }
    .card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .block { page-break-inside: avoid; margin-bottom: 14px; }
    h2 { font-size: 13px; margin: 0 0 8px; border-left: 3px solid ${accent}; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #555;
         border-bottom: 2px solid ${accent}; padding: 4px 6px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; width: 4em; }
    footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e3e3e3;
             color: #888; font-size: 10px; }
    @media print { body { margin: 12mm; } .cards { gap: 6px; } }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  </style></head><body>
  <header>
    ${logo}
    <div>
      <h1>Bilan presse — ${esc(data.event.name)}</h1>
      <div class="sub">${esc(data.event.location ?? 'Lieu non précisé')} · ${esc(period)}</div>
      <div class="sub">Généré le ${esc(generated)}</div>
    </div>
  </header>
  <div class="cards">${cards}</div>
  <div class="grid">
    ${kvTable('Accréditations par statut', k.byAccStatus, ACC_STATUS)}
    ${kvTable('Accréditations par type', k.byAccType, ACC_TYPE)}
    ${kvTable('Demandes par type', k.byRequestType, REQ_TYPE)}
    ${kvTable('Demandes par statut', k.byRequestStatus, REQ_STATUS)}
    ${kvTable('Retombées par catégorie', k.coverageByCategory, {})}
    ${rankTable('Médias les plus représentés', data.highlights.topMedia)}
    ${rankTable('Participants les plus demandés', data.highlights.topParticipants)}
  </div>
  <footer>PR Event 360 — document confidentiel · ${esc(data.event.name)}</footer>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('Impossible d’ouvrir la fenêtre d’impression (popup bloquée).');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
