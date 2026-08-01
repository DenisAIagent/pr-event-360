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
