/**
 * Bilan presse imprimable (Enregistrer en PDF via la boîte d'impression navigateur).
 * La coquille — identité de l'événement, suppression des mentions du navigateur,
 * attente du logo — vient de `lib/printDocument`.
 */
import { printBrandedDocument, resolveAccent } from '../../lib/printDocument';

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
  const accent = resolveAccent(data.branding);
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

  const styles = `
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
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `;

  const body = `
  <div class="cards">${cards}</div>
  <div class="grid">
    ${kvTable('Accréditations par statut', k.byAccStatus, ACC_STATUS)}
    ${kvTable('Accréditations par type', k.byAccType, ACC_TYPE)}
    ${kvTable('Demandes par type', k.byRequestType, REQ_TYPE)}
    ${kvTable('Demandes par statut', k.byRequestStatus, REQ_STATUS)}
    ${kvTable('Retombées par catégorie', k.coverageByCategory, {})}
    ${rankTable('Médias les plus représentés', data.highlights.topMedia)}
    ${rankTable('Participants les plus demandés', data.highlights.topParticipants)}
  </div>`;

  const opened = printBrandedDocument({
    title: `Bilan presse — ${data.event.name}`,
    branding: data.branding,
    heading: `Bilan presse — ${data.event.name}`,
    subtitle: `${data.event.location ?? 'Lieu non précisé'} · ${period} · généré le ${generated}`,
    footerLeft: data.event.name,
    footerRight: 'Bilan presse · document confidentiel',
    styles,
    body,
  });
  if (!opened) {
    throw new Error('Impossible d’ouvrir la fenêtre d’impression (popup bloquée).');
  }
}
