import { Router, type Request } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { requireAuth, requireEventEditor } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  disconnectTicketing,
  getTicketingStatus,
  listRemoteEvents,
  listRemoteTickets,
  provisionMissingGuests,
  saveTicketingConnection,
  simulateSandboxScan,
  syncTicketingCheckIns,
  testTicketingConnection,
} from '../../services/ticketing/ticketingService';

export const eventTicketingRouter = Router();
eventTicketingRouter.use(requireAuth);

const ProviderSchema = z.enum(['weezevent', 'billetweb', 'eventbrite', 'shotgun']);

const SaveSchema = z.object({
  provider: ProviderSchema,
  mode: z.enum(['live', 'sandbox']),
  credentials: z.record(z.string(), z.string()).optional(),
  externalEventId: z.string().nullish(),
  externalEventName: z.string().nullish(),
  externalTicketId: z.string().nullish(),
  externalTicketName: z.string().nullish(),
  autoProvision: z.boolean().optional(),
  autoSyncCheckin: z.boolean().optional(),
});

async function assertAccess(req: Request) {
  await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
}

eventTicketingRouter.get(
  '/:eventId/ticketing',
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    sendData(res, await getTicketingStatus(req.params.eventId!));
  }),
);

eventTicketingRouter.put(
  '/:eventId/ticketing',
  requireEventEditor,
  validateBody(SaveSchema),
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    const body = req.body as z.infer<typeof SaveSchema>;
    await saveTicketingConnection(req.params.eventId!, body);
    sendData(res, await getTicketingStatus(req.params.eventId!));
  }),
);

eventTicketingRouter.post(
  '/:eventId/ticketing/test',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    sendData(res, await testTicketingConnection(req.params.eventId!));
  }),
);

eventTicketingRouter.get(
  '/:eventId/ticketing/remote-events',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    sendData(res, await listRemoteEvents(req.params.eventId!));
  }),
);

eventTicketingRouter.get(
  '/:eventId/ticketing/remote-tickets',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    const ext = typeof req.query.externalEventId === 'string' ? req.query.externalEventId : undefined;
    sendData(res, await listRemoteTickets(req.params.eventId!, ext));
  }),
);

eventTicketingRouter.post(
  '/:eventId/ticketing/sync',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    sendData(res, await syncTicketingCheckIns(req.params.eventId!));
  }),
);

eventTicketingRouter.post(
  '/:eventId/ticketing/provision-missing',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    sendData(res, await provisionMissingGuests(req.params.eventId!));
  }),
);

eventTicketingRouter.post(
  '/:eventId/ticketing/simulate-scan',
  requireEventEditor,
  validateBody(z.object({ journalistId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    const { journalistId } = req.body as { journalistId: string };
    sendData(res, await simulateSandboxScan(req.params.eventId!, journalistId));
  }),
);

eventTicketingRouter.delete(
  '/:eventId/ticketing',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await assertAccess(req);
    await disconnectTicketing(req.params.eventId!);
    sendData(res, { ok: true });
  }),
);
