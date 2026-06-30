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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

/** robots.txt : ouvre le crawl et déclare le sitemap (sur l'hôte courant). */
seoRouter.get(
  '/robots.txt',
  (req, res) => {
    const proto = req.hostname === 'localhost' ? 'http' : 'https';
    const base = `${proto}://${req.get('host')}`;
    res
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
  },
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
      urls.push({ loc: newsroomUrl(hostEvent) });
      const cps = await listPublishedPressReleases(hostEvent.id);
      for (const cp of cps) urls.push({ loc: pressReleaseUrl(hostEvent, cp.slug), lastmod: cp.publishedAt });
    } else {
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/` });
      urls.push({ loc: `${env.PUBLIC_BASE_URL}/ressources` });
      const all = await listAllPublishedForSitemap();
      for (const entry of all) {
        const loc = pressReleaseUrl(entry.event, entry.slug);
        // Même hôte que ce sitemap : on ne liste que les CP canoniques sur la plateforme.
        if (loc.startsWith(env.PUBLIC_BASE_URL)) urls.push({ loc, lastmod: entry.publishedAt });
      }
    }

    res.type('application/xml').send(renderSitemap(urls));
  }),
);
