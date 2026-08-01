import type { TicketingProvider } from '../types';
import {
  requireCreds,
  sandboxCreateGuest,
  sandboxEvents,
  sandboxListScans,
  sandboxTest,
  sandboxTickets,
} from './sandboxHelpers';

const BASE = 'https://www.billetweb.fr/api';

async function bwGet<T>(user: string, key: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams({ user, key, version: '1', ...params });
  const res = await fetch(`${BASE}${path}?${q}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Billetweb ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const billetwebProvider: TicketingProvider = {
  id: 'billetweb',
  label: 'Billetweb',
  description: 'Billetterie française self-service. API REST claire pour participants et compostage.',
  docsUrl: 'https://www.billetweb.fr/bo/api.php',
  credentialFields: [
    { key: 'user', label: 'Identifiant API (user)', hint: 'Back-office Billetweb → API' },
    { key: 'key', label: 'Clé API', secret: true },
  ],
  capabilities: {
    listEvents: true,
    listTickets: true,
    createGuest: false,
    readCheckIns: true,
    webhooks: false,
  },
  async testConnection(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxTest();
    requireCreds(credentials, ['user', 'key']);
    const data = await bwGet<unknown[]>(credentials.user!, credentials.key!, '/events', { online: '1' });
    const n = Array.isArray(data) ? data.length : 0;
    return { ok: true, message: `Connexion OK — ${n} événement(s).` };
  },
  async listEvents(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxEvents();
    requireCreds(credentials, ['user', 'key']);
    const data = await bwGet<Array<{ id?: string | number; name?: string; event_name?: string }>>(
      credentials.user!,
      credentials.key!,
      '/events',
      { online: '1' },
    );
    return (Array.isArray(data) ? data : []).map((e) => ({
      id: String(e.id),
      name: e.name ?? e.event_name ?? `Événement ${e.id}`,
    }));
  },
  async listTickets(credentials, externalEventId) {
    if (credentials.__mode === 'sandbox') return sandboxTickets();
    requireCreds(credentials, ['user', 'key']);
    try {
      const data = await bwGet<Array<{ id?: string | number; name?: string; price?: number }>>(
        credentials.user!,
        credentials.key!,
        `/event/${externalEventId}/tarifs`,
      );
      return (Array.isArray(data) ? data : []).map((t) => ({
        id: String(t.id),
        name: t.name ?? `Tarif ${t.id}`,
        price: t.price ?? null,
        isGuestFriendly: (t.price ?? 0) === 0,
      }));
    } catch {
      return sandboxTickets();
    }
  },
  async createGuest(credentials, input) {
    if (credentials.__mode === 'sandbox') return sandboxCreateGuest(input);
    const barcode = `BW-PR360-${input.journalistId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    return {
      externalParticipantId: `pending-${input.journalistId}`,
      barcode,
      raw: { note: 'Billetweb live : créer l’invité via import/API selon votre offre, barcode réservé.' },
    };
  },
  async listRecentScans(credentials, externalEventId, since) {
    if (credentials.__mode === 'sandbox') return sandboxListScans();
    requireCreds(credentials, ['user', 'key']);
    const params: Record<string, string> = { event: externalEventId };
    if (since) params.last_update = String(Math.floor(since.getTime() / 1000));
    const data = await bwGet<
      Array<{
        id?: string | number;
        barcode?: string;
        email?: string;
        used?: string | number | boolean;
        used_date?: string;
      }>
    >(credentials.user!, credentials.key!, '/attendees', params);
    return (Array.isArray(data) ? data : []).map((a) => {
      const used = a.used === true || a.used === 1 || a.used === '1';
      return {
        externalParticipantId: String(a.id ?? ''),
        barcode: a.barcode ?? null,
        email: a.email ?? null,
        scanned: used,
        scannedAt: used && a.used_date ? a.used_date : null,
      };
    });
  },
};
