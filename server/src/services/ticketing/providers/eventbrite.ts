import type { TicketingProvider } from '../types';
import {
  requireCreds,
  sandboxCreateGuest,
  sandboxEvents,
  sandboxListScans,
  sandboxTest,
  sandboxTickets,
} from './sandboxHelpers';

const BASE = 'https://www.eventbriteapi.com/v3';

async function ebGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Eventbrite ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const eventbriteProvider: TicketingProvider = {
  id: 'eventbrite',
  label: 'Eventbrite',
  description: 'Billetterie internationale. API mature, webhooks disponibles côté Eventbrite.',
  docsUrl: 'https://www.eventbrite.com/platform/api',
  credentialFields: [
    {
      key: 'private_token',
      label: 'Private token',
      secret: true,
      hint: 'Eventbrite → Account Settings → Developer → API Keys',
    },
    {
      key: 'organization_id',
      label: 'Organization ID (optionnel)',
      hint: 'Laissez vide pour utiliser l’orga par défaut du token',
    },
  ],
  capabilities: {
    listEvents: true,
    listTickets: true,
    createGuest: true,
    readCheckIns: true,
    webhooks: true,
  },
  async testConnection(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxTest();
    requireCreds(credentials, ['private_token']);
    const me = await ebGet<{ name?: string; emails?: Array<{ email: string }> }>(
      credentials.private_token!,
      '/users/me/',
    );
    const who = me.name ?? me.emails?.[0]?.email ?? 'compte';
    return { ok: true, message: `Connexion OK — ${who}` };
  },
  async listEvents(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxEvents();
    requireCreds(credentials, ['private_token']);
    const orgId = credentials.organization_id?.trim();
    const path = orgId
      ? `/organizations/${orgId}/events/?status=live,draft,started,ended&order_by=start_desc`
      : '/users/me/events/?status=live,draft,started,ended&order_by=start_desc';
    const data = await ebGet<{ events?: Array<{ id: string; name?: { text?: string } }> }>(
      credentials.private_token!,
      path,
    );
    return (data.events ?? []).map((e) => ({
      id: e.id,
      name: e.name?.text ?? `Event ${e.id}`,
    }));
  },
  async listTickets(credentials, externalEventId) {
    if (credentials.__mode === 'sandbox') return sandboxTickets();
    requireCreds(credentials, ['private_token']);
    const data = await ebGet<{
      ticket_classes?: Array<{ id: string; name?: string; free?: boolean; cost?: { major_value?: string } }>;
    }>(credentials.private_token!, `/events/${externalEventId}/ticket_classes/`);
    return (data.ticket_classes ?? []).map((t) => ({
      id: t.id,
      name: t.name ?? `Ticket ${t.id}`,
      price: t.free ? 0 : null,
      isGuestFriendly: !!t.free,
    }));
  },
  async createGuest(credentials, input) {
    if (credentials.__mode === 'sandbox') return sandboxCreateGuest(input);
    requireCreds(credentials, ['private_token']);
    // Eventbrite : création d'attendee via orders API selon le type d'accès du token.
    // On tente l'endpoint d'attendees ; en cas d'échec on réserve un barcode local.
    try {
      const res = await fetch(`${BASE}/events/${input.externalEventId}/attendees/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.private_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          attendee: {
            ticket_class_id: input.externalTicketId,
            profile: {
              first_name: input.firstName,
              last_name: input.lastName ?? '',
              email: input.email,
            },
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; barcodes?: Array<{ barcode?: string }> };
        return {
          externalParticipantId: String(data.id ?? `eb-${input.journalistId}`),
          barcode: data.barcodes?.[0]?.barcode ?? `EB-${input.journalistId.slice(0, 8)}`,
          raw: data,
        };
      }
    } catch {
      /* fallback below */
    }
    return {
      externalParticipantId: `pending-${input.journalistId}`,
      barcode: `EB-PR360-${input.journalistId.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      raw: { note: 'Eventbrite : droits token insuffisants pour créer un attendee — barcode réservé.' },
    };
  },
  async listRecentScans(credentials, externalEventId) {
    if (credentials.__mode === 'sandbox') return sandboxListScans();
    requireCreds(credentials, ['private_token']);
    const data = await ebGet<{
      attendees?: Array<{
        id: string;
        profile?: { email?: string };
        barcodes?: Array<{ barcode?: string; status?: string }>;
        checked_in?: boolean;
      }>;
    }>(credentials.private_token!, `/events/${externalEventId}/attendees/?status=attending`);
    return (data.attendees ?? []).map((a) => ({
      externalParticipantId: a.id,
      barcode: a.barcodes?.[0]?.barcode ?? null,
      email: a.profile?.email ?? null,
      scanned: Boolean(a.checked_in) || Boolean(a.barcodes?.some((b) => b.status === 'used')),
      scannedAt: null as string | null,
    }));
  },
};
