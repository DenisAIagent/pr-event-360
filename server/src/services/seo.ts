import { loadEnv } from '../config/env';
import { escapeHtml, stripHtml } from './notifications/email';
import type { EventBranding, PressRelease } from '../domain';

const env = loadEnv();
const PLATFORM_NAME = 'PR Event 360';
const PLATFORM_LOGO = `${env.PUBLIC_BASE_URL}/brand/logo-pr-event-360.png`;

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
function socialImage(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    if (c && /^https?:\/\//i.test(c)) return c;
  }
  return PLATFORM_LOGO;
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
    datePublished: published,
    dateModified: published,
    image: [image],
    articleBody: stripHtml(cp.bodyHtml).slice(0, 5000),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: { '@type': 'Organization', name: event.name },
    publisher: {
      '@type': 'Organization',
      name: event.name,
      logo: { '@type': 'ImageObject', url: socialImage(branding?.logoUrl) },
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

/**
 * Injecte le `<head>` SEO et/ou le contexte d'événement (mode domaine) dans l'index SPA.
 * Retire le title/description statiques quand on a des balises propres à la page.
 */
export function injectHead(
  indexHtml: string,
  headHtml: string,
  eventData: { id: string; name: string } | null,
): string {
  let html = indexHtml;
  if (headHtml) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
      .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  }
  const eventScript = eventData
    ? `  <script type="application/json" id="__pr_event__">${JSON.stringify(eventData).replace(/</g, '\\u003c')}</script>\n`
    : '';
  return html.replace('</head>', `${headHtml}${eventScript}  </head>`);
}

export { PLATFORM_NAME, PLATFORM_LOGO };
