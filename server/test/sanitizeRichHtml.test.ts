import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from '../src/lib/sanitizeRichHtml';
import { youtubeEmbedHtml } from '../src/lib/youtube';

describe('sanitizeRichHtml — bases anti-XSS', () => {
  it('supprime scripts, handlers et schémas dangereux', () => {
    expect(sanitizeRichHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
    expect(sanitizeRichHtml('<img src="https://a.fr/i.jpg" onload="alert(1)" />')).not.toContain('onload');
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });
});

describe('sanitizeRichHtml — iframes vidéo', () => {
  it('conserve le lecteur YouTube « privacy-enhanced » (bloc inséré par l’éditeur)', () => {
    const out = sanitizeRichHtml(`<p>Regardez :</p>${youtubeEmbedHtml('dQw4w9WgXcQ')}`);
    expect(out).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(out).toContain('allowfullscreen');
    expect(out).toContain('<figure>');
    expect(out).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  it('force referrerpolicy sur les iframes déjà stockées sans l’attribut (ré-assainies à la lecture)', () => {
    const out = sanitizeRichHtml('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>');
    expect(out).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  it('supprime les iframes de tout autre hôte', () => {
    expect(sanitizeRichHtml('<iframe src="https://evil.com/embed/x"></iframe>')).not.toContain('iframe');
    expect(sanitizeRichHtml('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')).not.toContain(
      'iframe',
    );
    expect(
      sanitizeRichHtml('<iframe src="https://www.youtube-nocookie.com.evil.com/embed/x"></iframe>'),
    ).not.toContain('iframe');
  });

  it('supprime les iframes sans https ou sans src', () => {
    expect(sanitizeRichHtml('<iframe src="http://www.youtube-nocookie.com/embed/x"></iframe>')).not.toContain(
      'http://',
    );
    expect(sanitizeRichHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe>')).not.toContain('script');
  });
});

/**
 * Garde-fou de configuration (SEC-05).
 *
 * Les avis GHSA-jxwj-j7wr-gfrw (mutation-XSS via `</textarea/>`) et
 * GHSA-g8qq-57p8-ggw5 (SVG SMIL) visent des configurations qui autorisent
 * `textarea` ou `svg`. L'allowlist de ce projet ne les contient pas : les
 * charges des deux avis étaient déjà neutralisées avant la montée de version.
 * Ces tests verrouillent cette propriété — c'est elle, et non le numéro de
 * version, qui protège la newsroom publique.
 */
describe('sanitizeRichHtml — charges des avis sanitize-html', () => {
  it('neutralise la mutation-XSS par `</textarea/>` (GHSA-jxwj-j7wr-gfrw)', () => {
    const out = sanitizeRichHtml('<p><textarea/></textarea/><img src=x onerror=alert(1)></p>');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('textarea');
  });

  it('neutralise les animations SMIL qui réécrivent href (GHSA-g8qq-57p8-ggw5)', () => {
    const out = sanitizeRichHtml(
      '<a href="https://ok.test"><svg><set attributeName="href" to="javascript:alert(1)"/></svg></a>',
    );
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('<set');
    expect(out).not.toContain('<svg');
  });

  it('n’autorise ni textarea ni svg dans l’allowlist éditoriale', () => {
    expect(sanitizeRichHtml('<textarea>x</textarea>')).not.toContain('textarea');
    expect(sanitizeRichHtml('<svg><circle r="1"/></svg>')).not.toContain('svg');
  });
});
