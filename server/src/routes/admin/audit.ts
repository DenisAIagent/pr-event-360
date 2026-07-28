import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { listAuditEntries } from '../../db/repositories/auditRepo';

export const auditRouter = Router();

// Consultation réservée aux administrateurs : le journal est lui-même une donnée
// personnelle (art. 4.1) et sert à instruire les demandes d'accès (art. 15) ainsi
// qu'à qualifier une violation (art. 33).
auditRouter.use(requireAuth, requireRole('admin'));

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

auditRouter.get(
  '/',
  validateQuery(ListQuerySchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as unknown as z.infer<typeof ListQuerySchema>;
    // Cloisonnement multi-tenant : un admin d'organisation ne voit que son organisation.
    // Seul l'administrateur de la plateforme obtient la vue globale.
    const organizationId = req.user!.isPlatformAdmin ? null : (req.user!.organizationId ?? null);
    sendData(res, { entries: await listAuditEntries({ organizationId, limit }) });
  }),
);
