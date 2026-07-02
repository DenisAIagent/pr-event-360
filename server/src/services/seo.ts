import { loadEnv } from '../config/env';
import { escapeHtml, stripHtml } from './notifications/email';
import type { EventBranding, PressRelease } from '../domain';

const env = loadEnv();
const PLATFORM_NAME = 'PR Event 360';
const PLATFORM_LOGO = `${env.PUBLIC_BASE_URL}/brand/logo-pr-event-360.png`;
// Carte sociale 1200×630 dédiée aux partages (un logo brut est mal cadré par les réseaux).
const PLATFORM_CARD = `${env.PUBLIC_BASE_URL}/brand/social-card.jpg`;
const PLATFORM_TITLE = 'PR Event 360 — Votre orchestrateur de relations presse';
const PLATFORM_DESCRIPTION =
  "PR Event 360, votre orchestrateur de relations presse événementielles : accréditations, demandes d'interview et de reportage, planning, newsroom et communications, de l'accréditation à la retombée.";

/** Balise robots noindex (surfaces privées : admin, espaces tokenisés, auth). */
const NOINDEX_TAG = '    <meta name="robots" content="noindex, nofollow" />\n  ';

/** Champs d'événement nécessaires au calcul des URLs publiques (typage structurel). */
export interface SeoEvent {
  id: string;
  name: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  subdomainSlug: string | null;
}

/** Domaine public propre de l'événement (custom vérifié ou sous-domaine plateforme), sinon null. */
function eventDomainBase(event: SeoEvent): string | null {
  if (event.customDomain && event.customDomainVerified) return `https://${event.customDomain}`;
  if (event.subdomainSlug && env.PLATFORM_BASE_DOMAIN) {
    return `https://${event.subdomainSlug}.${env.PLATFORM_BASE_DOMAIN}`;
  }
  return null;
}

/** URL absolue canonique de la newsroom de l'événement. */
export function newsroomUrl(event: SeoEvent): string {
  const base = eventDomainBase(event);
  return base ? `${base}/newsroom` : `${env.PUBLIC_BASE_URL}/newsroom/${event.id}`;
}

/** URL absolue canonique d'un communiqué (identique quel que soit l'hôte qui sert la page). */
export function pressReleaseUrl(event: SeoEvent, slug: string): string {
  const base = eventDomainBase(event);
  return base ? `${base}/newsroom/${slug}` : `${env.PUBLIC_BASE_URL}/newsroom/${event.id}/${slug}`;
}

/** Première image http(s) exploitable comme image sociale (les data: URL ne marchent pas pour l'OG). */
function httpUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    if (c && /^https?:\/\//i.test(c)) return c;
  }
  return null;
}

function socialImage(...candidates: Array<string | null | undefined>): string {
  return httpUrl(...candidates) ?? PLATFORM_CARD;
}

const meta = (prop: 'name' | 'property', key: string, content: string): string =>
  `<meta ${prop}="${key}" content="${escapeHtml(content)}" />`;

interface HeadParts {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'article' | 'website';
  siteName: string;
  publishedTime?: string | null;
  jsonLd?: object;
}

function renderHead(p: HeadParts): string {
  const tags = [
    `<title>${escapeHtml(p.title)}</title>`,
    meta('name', 'description', p.description),
    `<link rel="canonical" href="${escapeHtml(p.canonical)}" />`,
    meta('property', 'og:type', p.type),
    meta('property', 'og:title', p.title),
    meta('property', 'og:description', p.description),
    meta('property', 'og:url', p.canonical),
    meta('property', 'og:image', p.image),
    meta('property', 'og:site_name', p.siteName),
    meta('property', 'og:locale', 'fr_FR'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', p.title),
    meta('name', 'twitter:description', p.description),
    meta('name', 'twitter:image', p.image),
  ];
  if (p.publishedTime) tags.push(meta('property', 'article:published_time', p.publishedTime));
  if (p.jsonLd) {
    // Échappe `<` pour ne pas pouvoir fermer la balise script depuis les données.
    const json = JSON.stringify(p.jsonLd).replace(/</g, '\\u003c');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return tags.map((t) => `    ${t}`).join('\n') + '\n  ';
}

/** `<head>` SEO complet d'un communiqué (title, description, Open Graph, Twitter, JSON-LD NewsArticle). */
export function pressReleaseHead(opts: {
  event: SeoEvent;
  branding: EventBranding | null;
  cp: PressRelease;
}): string {
  const { event, branding, cp } = opts;
  const canonical = pressReleaseUrl(event, cp.slug);
  const description = (cp.seoDescription || stripHtml(cp.bodyHtml)).slice(0, 200).trim();
  const image = socialImage(cp.coverImageUrl, branding?.bgImageUrl, branding?.logoUrl);
  // pg renvoie les timestamptz en objets Date : on normalise en chaîne ISO pour les balises.
  const toIso = (d: string | null): string => (d ? new Date(d).toISOString() : new Date(cp.createdAt).toISOString());
  const published = toIso(cp.publishedAt);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: cp.title.slice(0, 110),
    // Pas de dateModified : la table ne trace pas les mises à jour — mieux vaut
    // l'omettre (Google retombe sur datePublished) qu'affirmer une date fausse.
    datePublished: published,
    image: [image],
    articleBody: stripHtml(cp.bodyHtml).slice(0, 5000),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: { '@type': 'Organization', name: event.name },
    publisher: {
      '@type': 'Organization',
      name: event.name,
      logo: { '@type': 'ImageObject', url: httpUrl(branding?.logoUrl) ?? PLATFORM_LOGO },
    },
  };
  return renderHead({
    title: `${cp.title} — ${event.name}`,
    description,
    canonical,
    image,
    type: 'article',
    siteName: event.name,
    publishedTime: published,
    jsonLd,
  });
}

/** `<head>` SEO de la page newsroom (liste). */
export function newsroomHead(opts: { event: SeoEvent; branding: EventBranding | null }): string {
  const { event, branding } = opts;
  const canonical = newsroomUrl(event);
  return renderHead({
    title: `Espace presse — ${event.name}`,
    description: `Communiqués de presse, photos, vidéos et ressources médias de ${event.name}.`,
    canonical,
    image: socialImage(branding?.bgImageUrl, branding?.logoUrl),
    type: 'website',
    siteName: event.name,
  });
}

/** `<head>` SEO de la landing plateforme (canonical, Open Graph, JSON-LD Organization). */
export function platformHead(): string {
  return renderHead({
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
    canonical: `${env.PUBLIC_BASE_URL}/`,
    image: PLATFORM_CARD,
    type: 'website',
    siteName: PLATFORM_NAME,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: PLATFORM_NAME,
          url: `${env.PUBLIC_BASE_URL}/`,
          logo: PLATFORM_LOGO,
        },
        {
          '@type': 'SoftwareApplication',
          name: PLATFORM_NAME,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: `${env.PUBLIC_BASE_URL}/`,
          description: PLATFORM_DESCRIPTION,
        },
      ],
    },
  });
}

/** `<head>` SEO d'une page statique plateforme (ressources, pages légales). */
export function staticPageHead(pathName: string, title: string, description: string): string {
  return renderHead({
    title: `${title} — ${PLATFORM_NAME}`,
    description,
    canonical: `${env.PUBLIC_BASE_URL}${pathName}`,
    image: PLATFORM_CARD,
    type: 'website',
    siteName: PLATFORM_NAME,
  });
}

/** `<head>` SEO du formulaire d'accréditation (surface cherchée par les journalistes). */
export function accreditationHead(opts: { event: SeoEvent; branding: EventBranding | null }): string {
  const { event, branding } = opts;
  const base = `Accréditation presse — ${event.name}`;
  return renderHead({
    title: base,
    description: `Demandez votre accréditation presse pour ${event.name} : formulaire officiel pour journalistes, photographes et créateurs de contenu.`,
    canonical: accreditationUrl(event),
    image: socialImage(branding?.bgImageUrl, branding?.logoUrl),
    type: 'website',
    siteName: event.name,
  });
}

/** URL absolue canonique du formulaire d'accréditation. */
export function accreditationUrl(event: SeoEvent): string {
  const base = eventDomainBase(event);
  return base ? `${base}/` : `${env.PUBLIC_BASE_URL}/accreditation/${event.id}`;
}

/**
 * Corps HTML statique d'un communiqué, injecté dans `#root` pour les crawlers qui
 * n'exécutent pas le JavaScript (GPTBot, ClaudeBot, PerplexityBot…). React remplace
 * ce contenu au montage ; le client relit les mêmes données via `__pr_cp__` pour
 * rendre immédiatement sans flash de chargement.
 */
export function pressReleaseStaticBody(opts: { event: SeoEvent; cp: PressRelease }): string {
  const { event, cp } = opts;
  const dateLabel = cp.publishedAt
    ? new Date(cp.publishedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
    : null;
  const cover = httpUrl(cp.coverImageUrl);
  return [
    '<main style="max-width:760px;margin:0 auto;padding:40px 24px">',
    '<article>',
    `<p>Communiqué de presse — ${escapeHtml(event.name)}</p>`,
    `<h1>${escapeHtml(cp.title)}</h1>`,
    dateLabel ? `<p>${escapeHtml(dateLabel)}</p>` : '',
    cover ? `<img src="${escapeHtml(cover)}" alt="" style="max-width:100%" />` : '',
    // bodyHtml est assaini à l'écriture ET à la lecture (sanitizeRichHtml) par l'appelant.
    cp.bodyHtml,
    '</article>',
    '</main>',
  ]
    .filter(Boolean)
    .join('\n');
}

interface InjectOptions {
  /** Balises `<head>` propres à la page (remplace title/description statiques). */
  headHtml?: string;
  /** Contexte d'événement (mode domaine personnalisé). */
  eventData?: { id: string; name: string } | null;
  /** Marque la page « noindex, nofollow » (surfaces privées ou tokenisées). */
  noindex?: boolean;
  /** Contenu statique pré-rendu placé dans `#root` (crawlers sans JavaScript). */
  rootHtml?: string;
  /** Données initiales `PressReleaseDetail` relues par le client (script JSON inerte). */
  pressReleaseData?: object | null;
}

/**
 * Injecte le `<head>` SEO, le contexte d'événement et/ou le contenu pré-rendu dans
 * l'index SPA. Retire le title/description statiques quand on a des balises propres.
 */
export function injectHead(indexHtml: string, opts: InjectOptions): string {
  const { headHtml = '', eventData = null, noindex = false, rootHtml = '', pressReleaseData = null } = opts;
  let html = indexHtml;
  if (headHtml) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
      .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  }
  const jsonScript = (id: string, data: object): string =>
    `  <script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n`;
  const eventScript = eventData ? jsonScript('__pr_event__', eventData) : '';
  const cpScript = pressReleaseData ? jsonScript('__pr_cp__', pressReleaseData) : '';
  const robots = noindex ? NOINDEX_TAG : '';
  html = html.replace('</head>', `${headHtml}${robots}${eventScript}${cpScript}  </head>`);
  if (rootHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`);
  }
  return html;
}

export { PLATFORM_NAME, PLATFORM_LOGO, PLATFORM_CARD };
