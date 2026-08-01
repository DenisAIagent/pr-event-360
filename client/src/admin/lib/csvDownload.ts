/**
 * Téléchargements CSV côté client (filtre UI) et côté serveur (export complet).
 * Format Excel FR : BOM UTF-8 + séparateur `;`.
 */

const SEP = ';';
const BOM = '\uFEFF';

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Construit et déclenche le téléchargement d'un CSV à partir de lignes en mémoire. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): void {
  const lines = [headers.map(escapeCell).join(SEP)];
  for (const row of rows) lines.push(row.map(escapeCell).join(SEP));
  const blob = new Blob([BOM + lines.join('\r\n') + '\r\n'], {
    type: 'text/csv;charset=utf-8',
  });
  triggerBlobDownload(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob);
}

/** Télécharge un export CSV généré par l'API (auth cookie). */
export async function fetchServerCsv(path: string, filename: string): Promise<void> {
  const res = await fetch(`/api${path}`, { credentials: 'include' });
  if (!res.ok) {
    let message = `Export impossible (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* corps non JSON */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);
  triggerBlobDownload(match?.[1] ?? filename, blob);
}

function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
