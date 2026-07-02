import { Router } from 'express';
import { asyncHandler } from '../http/asyncHandler';
import { loadEnv } from '../config/env';
import { resolveEventForHost } from '../services/siteService';
import { newsroomUrl, pressReleaseUrl } from '../services/seo';
import {
  listAllPublishedForSitemap,
  listPublishedPressReleases,
} from '../db/repositories/pressReleaseRepo';

const env = loadEnv();

export const seoRouter = Router();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
}

function renderSitemap(urls: SitemapUrl[]): string {
  const seen = new Set<string>();
  const items = urls
    .filter((u) => (seen.has(u.loc) ? false : (seen.add(u.loc), true)))
    .map((u) => {
      // pg renvoie les dates en objets Date : on normalise en ISO (YYYY-MM-DD).
      const lastmod = u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
      return `  <url><loc>${escapeXml(u.loc)}</loc>${lastmod}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

/**
 * Chemins privés ou tokenisés : exclus du crawl (robots.txt) ET marqués noindex
 * (renderSpa) — le Disallow seul n'empêche pas l'indexation d'une URL liée ailleurs.
 */
export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/espace/',
  '/espace-preview/',
  '/connexion',
  '/mot-de-passe-oublie',
  '/reinitialiser',
  '/evenement/',
] as const;

/** robots.txt : ouvre le crawl public, exclut les surfaces privées, déclare le sitemap. */
seoRouter.get(
  '/robots.txt',
  (req, res) => {
    const proto = req.hostname === 'localhost' ? 'http' : 'https';
    const base = `${proto}://${req.get('host')}`;
    const disallow = ['/api/', ...PRIVATE_PATH_PREFIXES].map((p) => `Disallow: ${p}`).join('\n');
    res
      .type('text/plain')
      .setHeader('Cache-Control', 'public, max-age=3600')
      .send(`User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${base}/sitemap.xml\n`);
  },
);

/** llms.txt : oriente les crawlers IA vers les contenus publics citables. */
seoRouter.get(
  '/llms.txt',
  asyncHandler(async (req, res) => {
    const proto = req.hostname === 'localhost' ? 'http' : 'https';
    const base = `${proto}://${req.get('host')}`;
    const hostEvent = await resolveEventForHost(req.hostname).catch(() => null);
    const body = hostEvent
      ? `# ${hostEvent.name} — Espace presse\n\n> Newsroom officielle de ${hostEvent.name} : communiqués de presse, photos, vidéos et ressources médias.\n\n## Contenus\n\n- [Newsroom](${newsroomUrl(hostEvent)}) : communiqués publiés\n- [Sitemap](${base}/sitemap.xml) : liste complète des URLs\n`
      : `# PR Event 360\n\n> Plateforme de gestion des relations presse événementielles : accréditations, demandes d'interview et de reportage, planning, newsroom et communications.\n\n## Contenus\n\n- [Accueil](${base}/) : présentation de la plateforme\n- [Ressources](${base}/ressources) : guides relations presse\n- [Sitemap](${base}/sitemap.xml) : liste complète des URLs (dont newsrooms publiques)\n`;
    res.type('text/plain; charset=utf-8').setHeader('Cache-Control', 'public, max-age=3600').send(body);
  }),
);

/**
 * sitemap.xml :
 * - sur le domaine d'un événement → newsroom + ses CP publiés ;
 * - sur la plateforme → pages publiques + tous les CP dont l'URL canonique est sur la plateforme
 *   (ceux des événements à domaine propre sont listés par le sitemap de leur domaine).
 */
seoRouter.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const hostEvent = await resolveEventForHost(req.hostname).catch(() => null);
    const urls: SitemapUrl[] = [];

    if (hostEvent) {
      const proto = req.hostname === 'localhost' ? 'http' : 'https';
      const base = `${proto}://${req.get('host')}`;
      urls.push({ loc: `${base}/` }); // racine du domaine = formulaire d'accréditation
      urls.push({ loc: newsroomUrl(hostEvent) });
      const cps = await listPublishedPressReleases(hostEvent.id);
      for (const cp of cps) urls.push({ loc: pressReleaseUrl(hostEvent, cp.slug), lastmod: cp.publishedAt });
    } else {
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/` });
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/ressources` });
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/confidentialite` });
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/mentions-legales` });
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/cgv` });
      const all = await listAllPublishedForSitemap();
      for (const entry of all) {
        const loc = pressReleaseUrl(entry.event, entry.slug);
        // Même hôte que ce sitemap : on ne liste que les CP canoniques sur la plateforme.
        if (loc.startsWith(env.PUBLIC_BASE_URL)) urls.push({ loc, lastmod: entry.publishedAt });
      }
    }

    // Cache 5 min : la requête joint press_releases × events à chaque appel (anti-DoS léger).
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=300').send(renderSitemap(urls));
  }),
);
