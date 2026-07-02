import { describe, expect, it } from 'vitest';
import {
  youtubeEmbedHtml,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeVideoId,
  youtubeWatchUrl,
} from '../src/lib/youtube';

const ID = 'dQw4w9WgXcQ';

describe('youtubeVideoId', () => {
  it('reconnaît les formats d’URL courants collés par les RP', () => {
    expect(youtubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(youtubeVideoId(`https://youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
    expect(youtubeVideoId(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(youtubeVideoId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(youtubeVideoId(`https://youtu.be/${ID}?si=partage`)).toBe(ID);
    expect(youtubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(youtubeVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(youtubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID);
    expect(youtubeVideoId(`  https://www.youtube.com/watch?v=${ID}  `)).toBe(ID);
  });

  it('rejette les URLs non YouTube ou malformées', () => {
    expect(youtubeVideoId('https://vimeo.com/12345')).toBeNull();
    expect(youtubeVideoId('https://evil.com/watch?v=' + ID)).toBeNull();
    expect(youtubeVideoId('https://youtube.com.evil.com/watch?v=' + ID)).toBeNull();
    expect(youtubeVideoId('https://www.youtube.com/watch?v=trop-court')).toBeNull();
    expect(youtubeVideoId('https://www.youtube.com/@chaine')).toBeNull();
    expect(youtubeVideoId('pas une url')).toBeNull();
    expect(youtubeVideoId(`javascript:alert(1)//${ID}`)).toBeNull();
    expect(youtubeVideoId('')).toBeNull();
  });
});

describe('URLs générées', () => {
  it('construit lecteur sans cookies, page watch et miniature', () => {
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    expect(youtubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(youtubeThumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });

  it('le bloc d’intégration cible le lecteur sans cookies avec allowfullscreen', () => {
    const html = youtubeEmbedHtml(ID);
    expect(html).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}"`);
    expect(html).toContain('allowfullscreen');
    expect(html).toContain('<figure>');
    // Referer requis par le player (erreur 153) — n'envoie que l'origine.
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });
});
