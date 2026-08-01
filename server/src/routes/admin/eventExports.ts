import { Router, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth } from '../../middleware/auth';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  buildEventBilan,
  exportAccreditationsCsv,
  exportCoverageCsv,
  exportPlanningCsv,
  exportRequestsCsv,
} from '../../services/eventExportService';
import { safeFilename } from '../../lib/csv';
import type { QueueFilters } from '../../services/queueService';

/**
 * Exports opérationnels d'un événement (CSV Excel-friendly + bilan JSON).
 * Accessible à tout membre ayant accès à l'événement (assistant inclus).
 */
export const eventExportsRouter = Router();
eventExportsRouter.use(requireAuth);

const REQUEST_TYPE = z.enum(['interview', 'photo_report', 'video_report']);
const STATUS = z.enum([
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
  'liste_attente',
]);

function sendCsv(res: Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(filename)}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(body);
}

eventExportsRouter.get(
  '/:eventId/exports/accreditations.csv',
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const csv = await exportAccreditationsCsv(event.id);
    sendCsv(res, `${event.name}-accreditations.csv`, csv);
  }),
);

eventExportsRouter.get(
  '/:eventId/exports/requests.csv',
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const filters: QueueFilters = {};
    const type = REQUEST_TYPE.optional().parse(req.query.type || undefined);
    const status = STATUS.optional().parse(req.query.status || undefined);
    if (type) filters.type = type;
    if (status) filters.status = status;
    const csv = await exportRequestsCsv(event.id, filters);
    sendCsv(res, `${event.name}-demandes.csv`, csv);
  }),
);

eventExportsRouter.get(
  '/:eventId/exports/planning.csv',
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const csv = await exportPlanningCsv(event.id);
    sendCsv(res, `${event.name}-planning.csv`, csv);
  }),
);

eventExportsRouter.get(
  '/:eventId/exports/coverage.csv',
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const csv = await exportCoverageCsv(event.id);
    sendCsv(res, `${event.name}-retombees.csv`, csv);
  }),
);

eventExportsRouter.get(
  '/:eventId/exports/bilan',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    res.setHeader('Cache-Control', 'no-store');
    sendData(res, await buildEventBilan(req.params.eventId!));
  }),
);
