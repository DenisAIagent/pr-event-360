import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';
import {
  accreditationUrl,
  injectHead,
  newsroomUrl,
  platformHead,
  pressReleaseHead,
  pressReleaseStaticBody,
  pressReleaseUrl,
  staticPageHead,
  type SeoEvent,
} from '../src/services/seo';
import type { PressRelease } from '../src/domain';

const env = loadEnv();

const platformEvent: SeoEvent = {
  id: 'evt-1',
  name: 'Festival Test',
  customDomain: null,
  customDomainVerified: false,
  subdomainSlug: null,
};

const domainEvent: SeoEvent = {
  ...platformEvent,
  customDomain: 'presse.festival-test.fr',
  customDomainVerified: true,
};

const cp: PressRelease = {
  id: 'cp-1',
  eventId: 'evt-1',
  title: 'Annonce <officielle> du lineup',
  bodyHtml: '<p>Le lineup complet est dévoilé.</p>',
  slug: 'annonce-lineup',
  seoDescription: null,
  coverImageUrl: null,
  publishedAt: '2026-06-01T10:00:00.000Z',
  status: 'published',
  createdAt: '2026-05-20T09:00:00.000Z',
};

describe('URLs canoniques', () => {
  it('utilise le domaine personnalisé vérifié', () => {
    expect(newsroomUrl(domainEvent)).toBe('https://presse.festival-test.fr/newsroom');
    expect(pressReleaseUrl(domainEvent, 'slug-x')).toBe('https://presse.festival-test.fr/newsroom/slug-x');
    expect(accreditationUrl(domainEvent)).toBe('https://presse.festival-test.fr/');
  });

  it("retombe sur la plateforme sans domaine propre (l'URL contient l'ID d'événement)", () => {
    expect(newsroomUrl(platformEvent)).toBe(`${env.PUBLIC_BASE_URL}/newsroom/evt-1`);
    expect(pressReleaseUrl(platformEvent, 'slug-x')).toBe(`${env.PUBLIC_BASE_URL}/newsroom/evt-1/slug-x`);
    expect(accreditationUrl(platformEvent)).toBe(`${env.PUBLIC_BASE_URL}/accreditation/evt-1`);
  });

  it('ignore un domaine personnalisé non vérifié', () => {
    const unverified: SeoEvent = { ...domainEvent, customDomainVerified: false };
    expect(newsroomUrl(unverified)).toBe(`${env.PUBLIC_BASE_URL}/newsroom/evt-1`);
  });
});

describe('pressReleaseHead', () => {
  const head = pressReleaseHead({ event: domainEvent, branding: null, cp });

  it('contient title, canonical, Open Graph et og:locale', () => {
    expect(head).toContain('<title>Annonce &lt;officielle&gt; du lineup — Festival Test</title>');
    expect(head).toContain('<link rel="canonical" href="https://presse.festival-test.fr/newsroom/annonce-lineup" />');
    expect(head).toContain('property="og:type" content="article"');
    expect(head).toContain('property="og:locale" content="fr_FR"');
  });

  it('émet un JSON-LD NewsArticle sans dateModified (non tracée en base)', () => {
    expect(head).toContain('"@type":"NewsArticle"');
    expect(head).toContain('"datePublished":"2026-06-01T10:00:00.000Z"');
    expect(head).not.toContain('dateModified');
  });

  it('échappe `<` dans le JSON-LD (impossible de fermer la balise script)', () => {
    expect(head).toContain('\\u003c');
    expect(head).not.toContain('<officielle>');
  });
});

describe('heads plateforme', () => {
  it('platformHead : canonical racine + JSON-LD Organization', () => {
    const head = platformHead();
    expect(head).toContain(`<link rel="canonical" href="${env.PUBLIC_BASE_URL}/" />`);
    expect(head).toContain('"@type":"Organization"');
    expect(head).toContain('"@type":"SoftwareApplication"');
  });

  it('staticPageHead : title suffixé et canonical du chemin', () => {
    const head = staticPageHead('/ressources', 'Ressources relations presse', 'Guides pratiques.');
    expect(head).toContain('<title>Ressources relations presse — PR Event 360</title>');
    expect(head).toContain(`<link rel="canonical" href="${env.PUBLIC_BASE_URL}/ressources" />`);
  });
});

describe('pressReleaseStaticBody', () => {
  it('rend le titre échappé et le corps HTML tel quel (déjà assaini par l’appelant)', () => {
    const body = pressReleaseStaticBody({ event: domainEvent, cp });
    expect(body).toContain('<h1>Annonce &lt;officielle&gt; du lineup</h1>');
    expect(body).toContain('<p>Le lineup complet est dévoilé.</p>');
    expect(body).toContain('Festival Test');
  });
});

describe('injectHead', () => {
  const index =
    '<!doctype html><html><head><title>Statique</title>\n<meta name="description" content="desc" />\n</head><body><div id="root"></div></body></html>';

  it('remplace title/description statiques quand un head est fourni', () => {
    const html = injectHead(index, { headHtml: '<title>Propre</title>\n  ' });
    expect(html).toContain('<title>Propre</title>');
    expect(html).not.toContain('<title>Statique</title>');
    expect(html).not.toContain('name="description" content="desc"');
  });

  it('conserve le head statique sans headHtml et ajoute noindex si demandé', () => {
    const html = injectHead(index, { noindex: true });
    expect(html).toContain('<title>Statique</title>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("n'ajoute pas noindex par défaut", () => {
    expect(injectHead(index, {})).not.toContain('noindex');
  });

  it('injecte le contenu pré-rendu dans #root et les données __pr_cp__', () => {
    const html = injectHead(index, {
      rootHtml: '<article>Contenu crawlable</article>',
      pressReleaseData: { pressRelease: { slug: 'a<b' } },
    });
    expect(html).toContain('<div id="root"><article>Contenu crawlable</article></div>');
    expect(html).toContain('id="__pr_cp__"');
    expect(html).not.toContain('a<b'); // `<` échappé dans le JSON inerte
  });

  it("injecte le contexte d'événement (mode domaine)", () => {
    const html = injectHead(index, { eventData: { id: 'evt-1', name: 'Festival Test' } });
    expect(html).toContain('id="__pr_event__"');
    expect(html).toContain('"id":"evt-1"');
  });
});
