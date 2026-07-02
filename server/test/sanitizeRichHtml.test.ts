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
