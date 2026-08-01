import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { loadEnv } from '../../config/env';
import type { Journalist } from '../../domain';
import { validateBody } from '../../middleware/validate';
import { scopedRateLimit } from '../../middleware/rateLimit';
import { requireAuth, requireEventEditor } from '../../middleware/auth';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  listAccreditations,
  processAccreditation,
  resendAccreditationAccess,
} from '../../services/accreditationService';
import { deleteJournalist } from '../../db/repositories/journalistRepo';
import { changeRequestStatus } from '../../services/requestService';
import { getDashboard, getQueue } from '../../services/queueService';
import { generatePlanning } from '../../services/planningService';
import { listNotificationsByEvent } from '../../db/repositories/notificationRepo';
import { exportJournalistPersonalData } from '../../services/gdprExportService';

/**
 * Routeur « pipeline presse » : accréditations (traitement, renvoi de lien,
 * effacement RGPD), file des demandes, planning, tableau de bord et messages.
 * Monté sur /api/admin/events aux côtés du routeur cœur.
 */
export const eventPipelineRouter = Router();
eventPipelineRouter.use(requireAuth);

const env = loadEnv();

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

// ── Accréditations ──────────────────────────────────────────────────
eventPipelineRouter.get(
  '/:eventId/accreditations',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    res.setHeader('Cache-Control', 'no-store');
    sendData(res, (await listAccreditations(req.params.eventId!)).map(toAccreditationDto));
  }),
);

const ProcessSchema = z.object({ action: z.enum(['accept', 'reject']) });
eventPipelineRouter.post(
  '/:eventId/accreditations/:journalistId/process',
  validateBody(ProcessSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ProcessSchema>;
    const { journalist, accessToken } = await processAccreditation(
      req.params.eventId!,
      req.params.journalistId!,
      body.action,
    );
    // Le jeton d'espace n'est JAMAIS renvoyé au client en dehors des tests : il n'existe
    // en clair que dans le lien envoyé par email, et la base n'en garde que l'empreinte.
    // Les tests de bout en bout, eux, n'ont aucun autre moyen d'atteindre l'espace
    // journaliste — le corps des notifications redacte volontairement le lien.
    const testOnly = env.NODE_ENV === 'test' && accessToken ? { accessToken } : {};
    sendData(res, { ...toAccreditationDto(journalist), ...testOnly });
  }),
);

export function toAccreditationDto(journalist: Journalist) {
  const { passwordHash: _passwordHash, ...safe } = journalist;
  return { ...safe, hasPassword: Boolean(journalist.passwordHash) };
}

// Chaque renvoi tourne le jeton (l'ancien lien meurt) et déclenche un email réel.
// Sans plafond, un éditeur de l'événement peut spammer la boîte du journaliste :
// nuisance ciblée, coût d'envoi et dégradation de délivrabilité du domaine.
// Quota par couple événement+journaliste (et non par IP) : c'est la boîte visée
// qu'on protège, pas l'appelant.
const accessLinkResendLimiter = scopedRateLimit({
  windowMs: 60 * 60_000,
  limit: 3,
  keyGenerator: (req) => `${req.params.eventId}:${req.params.journalistId}`,
  // Les appels refusés (404 cross-tenant, journaliste inconnu) ne consomment pas
  // le quota : un tiers ne peut pas bloquer les renvois légitimes du propriétaire.
  skipFailedRequests: true,
  message:
    'Trop de renvois pour ce journaliste. Réessayez dans une heure — le dernier lien envoyé reste valable.',
});

eventPipelineRouter.post(
  '/:eventId/accreditations/:journalistId/access-link/resend',
  requireEventEditor,
  accessLinkResendLimiter,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await resendAccreditationAccess(req.params.eventId!, req.params.journalistId!);
    sendData(res, { sent: true });
  }),
);

// Effacement RGPD (art. 17) — suppression définitive d'un journaliste et de ses demandes.
eventPipelineRouter.delete(
  '/:eventId/accreditations/:journalistId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteJournalist(req.params.eventId!, req.params.journalistId!);
    sendData(res, { deleted: true });
  }),
);

// Export RGPD art. 15/20 — JSON structuré pour répondre aux demandes d'accès/portabilité.
eventPipelineRouter.get(
  '/:eventId/accreditations/:journalistId/export',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const payload = await exportJournalistPersonalData(
      req.params.eventId!,
      req.params.journalistId!,
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pr360-export-${req.params.journalistId!.slice(0, 8)}.json"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: payload });
  }),
);

// ── File des demandes ───────────────────────────────────────────────
eventPipelineRouter.get(
  '/:eventId/requests',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const type = REQUEST_TYPE.optional().parse(req.query.type || undefined);
    const status = STATUS.optional().parse(req.query.status || undefined);
    sendData(res, await getQueue(req.params.eventId!, { type, status }));
  }),
);

const StatusChangeSchema = z.object({
  status: STATUS.refine((s) => s !== 'liste_attente', 'Statut système non assignable'),
  note: z.string().nullish(),
});
eventPipelineRouter.post(
  '/:eventId/requests/:requestId/status',
  validateBody(StatusChangeSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StatusChangeSchema>;
    const updated = await changeRequestStatus(
      req.params.eventId!,
      req.params.requestId!,
      body.status,
      req.user!.sub,
      body.note ?? undefined,
    );
    sendData(res, updated);
  }),
);

// Génère/recalcule le planning des interviews (créneaux attribués par priorité).
eventPipelineRouter.post(
  '/:eventId/planning/generate',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await generatePlanning(req.params.eventId!));
  }),
);

// ── Tableau de bord & messages ──────────────────────────────────────
eventPipelineRouter.get(
  '/:eventId/dashboard',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getDashboard(req.params.eventId!));
  }),
);

// Messages paginés par curseur keyset (?limit=100&before=<cursor>) : la table
// croît en continu, le chargement intégral est proscrit. Renvoie
// { items, nextCursor } — nextCursor null = fin de liste.
eventPipelineRouter.get(
  '/:eventId/messages',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const limit = z.coerce.number().int().min(1).max(200).optional().parse(req.query.limit || undefined);
    const before = z.string().max(120).optional().parse(req.query.before || undefined);
    sendData(res, await listNotificationsByEvent(req.params.eventId!, { limit, before }));
  }),
);
