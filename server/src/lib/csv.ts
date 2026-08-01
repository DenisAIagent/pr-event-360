/**
 * Sérialisation CSV Excel-friendly (FR) :
 * - séparateur `;`
 * - échappement RFC 4180 (guillemets doublés)
 * - BOM UTF-8 pour qu'Excel Windows ouvre correctement les accents
 */

const SEP = ';';
const BOM = '\uFEFF';

/** Échappe une cellule (null/undefined → chaîne vide). */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[;"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Construit un document CSV complet (BOM + en-têtes + lignes). */
export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(SEP));
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(SEP));
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Nom de fichier sûr pour Content-Disposition. */
export function safeFilename(base: string): string {
  return base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}
