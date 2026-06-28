import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './config/env';
import { sendData } from './http/respond';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './routes/admin/auth';
import { eventsRouter } from './routes/admin/events';
import { teamRouter } from './routes/admin/team';
import { settingsRouter } from './routes/admin/settings';
import { searchRouter } from './routes/admin/search';
import { resolveEventForHost } from './services/siteService';
import { commsRouter } from './routes/admin/comms';
import { publicNewsroomRouter } from './routes/public/newsroom';
import { publicAccreditationRouter } from './routes/public/accreditation';
import { publicSpaceRouter } from './routes/public/space';
import { publicJournalistAuthRouter } from './routes/public/journalistAuth';

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
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cors({ origin: env.CLIENT_URL }));
  // Limite relevée : logo + image de fond encodés en data URL (base64) dépassent
  // largement le défaut de 100 ko.
  app.use(express.json({ limit: '6mb' }));

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
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    // `index: false` → la racine `/` ne court-circuite pas le handler ci-dessous,
    // qui peut injecter le contexte d'événement (domaine personnalisé) dans l'HTML.
    app.use(express.static(clientDist, { index: false }));
    const indexHtml = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      // Domaine personnalisé d'un événement → on injecte son ID/nom pour que la SPA
      // serve ses surfaces publiques à la racine (sans :eventId dans l'URL).
      const event = await resolveEventForHost(req.hostname).catch(() => null);
      if (!event) {
        res.type('html').send(indexHtml);
        return;
      }
      // Bloc de données (non exécuté → non bloqué par la CSP de helmet). Le client le
      // lit au démarrage. On échappe `<` pour ne pas pouvoir fermer la balise.
      const payload = JSON.stringify({ id: event.id, name: event.name }).replace(/</g, '\\u003c');
      const injected = indexHtml.replace(
        '</head>',
        `  <script type="application/json" id="__pr_event__">${payload}</script>\n  </head>`,
      );
      res.type('html').send(injected);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
