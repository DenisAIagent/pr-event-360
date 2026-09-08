import { describe, it, expect } from 'vitest';
import { escapeHtml, buildBadgeHtml } from '../src/badge';

describe('escapeHtml', () => {
  it('neutralise les caractères qui ouvrent une balise ou cassent un attribut', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;');
  });
});

describe('buildBadgeHtml', () => {
  const base = {
    name: 'Camille Rivière',
    eventName: 'Salon Tech & Médias',
    media: 'Presse quotidienne',
    qrDataUrl: 'data:image/png;base64,iVBORAAA',
    printHint: 'Présentez ce QR à l’entrée presse',
  };

  it('rend le badge attendu pour des données saines', () => {
    const html = buildBadgeHtml(base);
    expect(html).toContain('Camille Rivière');
    expect(html).toContain('Presse quotidienne');
    expect(html).toContain('data:image/png;base64,iVBORAAA');
    // L'esperluette du nom d'événement est échappée.
    expect(html).toContain('Salon Tech &amp; Médias');
  });

  it("échappe une charge XSS stockée dans le nom (régression X-01/X-02)", () => {
    const html = buildBadgeHtml({
      ...base,
      name: '<img src=x onerror=alert(document.cookie)>',
      media: '</h1><script>fetch("//evil")</script>',
    });
    // Aucune balise active ne doit subsister : ni le vecteur injecté…
    expect(html).not.toContain('<img src=x onerror=');
    expect(html).not.toContain('<script>fetch');
    // …et le document ne doit contenir AUCUN <script> (impression pilotée par l'ouvrant).
    expect(html).not.toMatch(/<script/i);
    // Le contenu injecté ressort échappé, donc inerte.
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;');
  });

  it('interdit toute exécution via une CSP verrouillée', () => {
    const html = buildBadgeHtml(base);
    expect(html).toMatch(
      /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"/,
    );
  });

  it('accepte un média absent sans injecter "null"', () => {
    const html = buildBadgeHtml({ ...base, media: null });
    expect(html).not.toContain('null');
  });
});
