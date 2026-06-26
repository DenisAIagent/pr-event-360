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
import { commsRouter } from './routes/admin/comms';
import { publicNewsroomRouter } from './routes/public/newsroom';
import { publicAccreditationRouter } from './routes/public/accreditation';
import { publicSpaceRouter } from './routes/public/space';

export function createApp(): Express {
  const env = loadEnv();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL }));
  // Limite relevée : logo + image de fond encodés en data URL (base64) dépassent
  // largement le défaut de 100 ko.
  app.use(express.json({ limit: '6mb' }));

  // Limite de débit sur les surfaces publiques sensibles (anti-abus).
  const publicLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true });

  app.get('/api/health', (_req, res) => sendData(res, { status: 'ok' }));

  // Back-office (auth requise dans les routers).
  app.use('/api/admin/auth', authRouter);
  app.use('/api/admin/events', eventsRouter);
  // Médias / newsroom / newsletters : mêmes routes /:eventId/* que eventsRouter,
  // déclaré après lui pour récupérer les chemins non gérés (assets, press, etc.).
  app.use('/api/admin/events', commsRouter);
  app.use('/api/admin/team', teamRouter);
  app.use('/api/admin/settings', settingsRouter);

  // Surfaces publiques (journalistes).
  app.use('/api/public', publicLimiter, publicAccreditationRouter);
  app.use('/api/public/space', publicLimiter, publicSpaceRouter);
  app.use('/api/public/newsroom', publicLimiter, publicNewsroomRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
