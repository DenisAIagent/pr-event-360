import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './config/env';
import { sendData } from './http/respond';
import { asyncHandler } from './http/asyncHandler';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './routes/admin/auth';
import { eventsRouter } from './routes/admin/events';
import { teamRouter } from './routes/admin/team';
import { settingsRouter } from './routes/admin/settings';
import { searchRouter } from './routes/admin/search';
import { organizationsRouter } from './routes/admin/organizations';
import { billingRouter } from './routes/admin/billing';
import { handleWebhook } from './services/billingService';
import { resolveEventForHost } from './services/siteService';
import { findEventById, getBranding } from './db/repositories/eventRepo';
import { findPressReleaseBySlug } from './db/repositories/pressReleaseRepo';
import { injectHead, newsroomHead, pressReleaseHead } from './services/seo';
import type { Event } from './domain';
import { commsRouter } from './routes/admin/comms';
import { publicNewsroomRouter } from './routes/public/newsroom';
import { publicAccreditationRouter } from './routes/public/accreditation';
import { publicSpaceRouter } from './routes/public/space';
import { publicJournalistAuthRouter } from './routes/public/journalistAuth';
import { seoRouter } from './routes/seoRoutes';

/**
 * Construit le HTML de la SPA pour une requête publique :
 * - injecte le contexte d'événement (mode domaine personnalisé) ;
 * - injecte les balises SEO (title/description/Open Graph/JSON-LD) pour les pages
 *   newsroom et communiqués, rendues côté serveur (crawlers + aperçus sociaux).
 */
async function renderSpa(hostname: string, pathName: string, indexHtml: string): Promise<string> {
  const hostEvent = await resolveEventForHost(hostname).catch(() => null);
  const segments = pathName.split('/').filter(Boolean);

  let event: Event | null = hostEvent;
  let cpSlug: string | null = null;
  let isNewsroomList = false;

  if (segments[0] === 'newsroom') {
    if (hostEvent) {
      // Mode domaine : /newsroom (liste) ou /newsroom/:slug (communiqué).
      if (segments.length === 1) isNewsroomList = true;
      else if (segments.length === 2) cpSlug = segments[1]!;
    } else {
      // Mode plateforme : /newsroom/:eventId (liste) ou /newsroom/:eventId/:slug (communiqué).
      const eventId = segments[1];
      if (eventId) {
        event = await findEventById(eventId).catch(() => null);
        if (event) {
          if (segments.length === 2) isNewsroomList = true;
          else if (segments.length === 3) cpSlug = segments[2]!;
        }
      }
    }
  }

  let headHtml = '';
  if (event && cpSlug) {
    const cp = await findPressReleaseBySlug(event.id, cpSlug).catch(() => null);
    if (cp && cp.status === 'published') {
      const branding = await getBranding(event.id).catch(() => null);
      headHtml = pressReleaseHead({ event, branding, cp });
    }
  } else if (event && isNewsroomList) {
    const branding = await getBranding(event.id).catch(() => null);
    headHtml = newsroomHead({ event, branding });
  }

  const eventData = hostEvent ? { id: hostEvent.id, name: hostEvent.name } : null;
  return injectHead(indexHtml, headHtml, eventData);
}

export function createApp(): Express {
  const env = loadEnv();
  const app = express();

  // CSP adaptée au front servi en production : styles inline (props React), polices
  // AUTO-HÉBERGÉES ('self'), images data:/https (logos en data URL, médias Cloudinary).
  // Referrer-Policy: no-referrer → ne fuite pas les tokens présents dans les URL
  // (ex. espace journaliste /espace/:token) vers des tiers.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // accounts.google.com : « Continuer avec Google » (Google Identity Services).
          scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'], // les RP collent des URLs d'images externes
          // Restreint aux destinations réellement appelées par le navigateur (anti-exfiltration
          // en cas de XSS) : notre API ('self'), l'upload Cloudinary, et Google Identity.
          connectSrc: ["'self'", 'https://api.cloudinary.com', 'https://accounts.google.com'],
          frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      // « Continuer avec Google » ouvre une popup qui doit pouvoir renvoyer le jeton à
      // notre page : le défaut `same-origin` de helmet coupe ce lien (popup bloquée /
      // onglet gsi/transform blanc). `same-origin-allow-popups` garde la protection
      // tout en autorisant la communication avec les popups d'auth.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(cors({ origin: env.CLIENT_URL }));

  // Webhook Stripe : la vérification de signature exige le CORPS BRUT → déclaré AVANT
  // express.json (qui consommerait/parserait le corps).
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (req, res) => {
      await handleWebhook(req.body as Buffer, req.headers['stripe-signature'] as string | undefined);
      sendData(res, { received: true });
    }),
  );

  // Budget JSON par famille de routes : 6 Mo uniquement pour l'admin (logo + image de fond en
  // data URL base64) ; les surfaces publiques sont plafonnées à 100 ko (anti-abus mémoire).
  app.use('/api/admin', express.json({ limit: '6mb' }));
  app.use(express.json({ limit: '100kb' }));

  // Limite de débit sur les surfaces publiques sensibles (anti-abus).
  const publicLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true });
  // Limiteur strict pour le login journaliste (anti-bruteforce).
  const journalistAuthLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true });

  app.get('/api/health', (_req, res) => sendData(res, { status: 'ok' }));

  // Back-office (auth requise dans les routers).
  app.use('/api/admin/auth', authRouter);
  app.use('/api/admin/events', eventsRouter);
  // Médias / newsroom / newsletters : mêmes routes /:eventId/* que eventsRouter,
  // déclaré après lui pour récupérer les chemins non gérés (assets, press, etc.).
  app.use('/api/admin/events', commsRouter);
  app.use('/api/admin/team', teamRouter);
  app.use('/api/admin/organizations', organizationsRouter);
  app.use('/api/admin/billing', billingRouter);
  app.use('/api/admin/settings', settingsRouter);
  app.use('/api/admin/search', searchRouter);

  // Surfaces publiques (journalistes).
  app.use('/api/public', publicLimiter, publicAccreditationRouter);
  app.use('/api/public/space', publicLimiter, publicSpaceRouter);
  app.use('/api/public/newsroom', publicLimiter, publicNewsroomRouter);
  app.use('/api/public/journalist', journalistAuthLimiter, publicJournalistAuthRouter);

  // En production, le serveur sert aussi le client compilé (même origine que l'API,
  // ce qui permet au front d'appeler /api en relatif). Les routes /api non trouvées
  // tombent en 404 JSON (notFoundHandler) ; tout le reste renvoie l'app SPA.
  // robots.txt / sitemap.xml — déclarés AVANT le catch-all SPA pour ne pas être avalés.
  app.use(seoRouter);

  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    // `index: false` → la racine `/` ne court-circuite pas le handler ci-dessous,
    // qui peut injecter le contexte d'événement (domaine personnalisé) dans l'HTML.
    app.use(express.static(clientDist, { index: false }));
    const indexHtml = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      try {
        res.type('html').send(await renderSpa(req.hostname, req.path, indexHtml));
      } catch {
        // Le rendu HTML ne doit jamais faire échouer une page : repli sur l'index brut.
        res.type('html').send(indexHtml);
      }
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
