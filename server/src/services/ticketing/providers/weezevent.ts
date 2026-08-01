import type { TicketingProvider } from '../types';
import {
  requireCreds,
  sandboxCreateGuest,
  sandboxEvents,
  sandboxListScans,
  sandboxTest,
  sandboxTickets,
} from './sandboxHelpers';

const BASE = 'https://api.weezevent.com';

async function accessToken(apiKey: string, username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ api_key: apiKey, username, password });
  const res = await fetch(`${BASE}/auth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`Weezevent auth ${res.status}`);
  const data = (await res.json()) as { accessToken?: string; access_token?: string };
  const token = data.accessToken ?? data.access_token;
  if (!token) throw new Error('Weezevent : access_token absent de la réponse');
  return token;
}

async function wzGet<T>(
  path: string,
  apiKey: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const q = new URLSearchParams({ api_key: apiKey, access_token: token, ...params });
  const res = await fetch(`${BASE}${path}?${q}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Weezevent ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/**
 * Weezevent (WeezTicket / API legacy).
 * Lecture events/tickets/participants + scans (control_status).
 * Création d'invité : non standardisée sur l'API publique → en live on documente
 * le fallback manuel ; le mode sandbox simule la création.
 */
export const weezeventProvider: TicketingProvider = {
  id: 'weezevent',
  label: 'Weezevent',
  description:
    'Billetterie et contrôle d’accès WeezAccess. Idéal si la prod scanne déjà avec Weezevent.',
  docsUrl: 'https://api.weezevent.com/',
  credentialFields: [
    { key: 'api_key', label: 'Clé API', secret: true, hint: 'Back-office Weezevent → Outils → Clés API' },
    { key: 'username', label: 'Email organisateur', hint: 'Compte ayant accès à l’événement' },
    { key: 'password', label: 'Mot de passe', secret: true },
  ],
  capabilities: {
    listEvents: true,
    listTickets: true,
    createGuest: false, // API publique : lecture ; invités via bac à sable ou import
    readCheckIns: true,
    webhooks: false,
  },
  async testConnection(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxTest();
    requireCreds(credentials, ['api_key', 'username', 'password']);
    const token = await accessToken(credentials.api_key!, credentials.username!, credentials.password!);
    const events = await wzGet<{ events?: unknown[] }>('/events', credentials.api_key!, token);
    const n = Array.isArray(events.events) ? events.events.length : Array.isArray(events) ? events.length : 0;
    return { ok: true, message: `Connexion OK — ${n} événement(s) accessible(s).` };
  },
  async listEvents(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxEvents();
    requireCreds(credentials, ['api_key', 'username', 'password']);
    const token = await accessToken(credentials.api_key!, credentials.username!, credentials.password!);
    const data = await wzGet<{ events?: Array<{ id: string | number; name?: string; title?: string }> }>(
      '/events',
      credentials.api_key!,
      token,
      { include_not_published: '1' },
    );
    const list = data.events ?? (data as unknown as Array<{ id: string | number; name?: string }>);
    return (Array.isArray(list) ? list : []).map((e) => ({
      id: String(e.id),
      name: e.name ?? (e as { title?: string }).title ?? `Événement ${e.id}`,
    }));
  },
  async listTickets(credentials, externalEventId) {
    if (credentials.__mode === 'sandbox') return sandboxTickets();
    requireCreds(credentials, ['api_key', 'username', 'password']);
    const token = await accessToken(credentials.api_key!, credentials.username!, credentials.password!);
    const data = await wzGet<{
      tickets?: Array<{ id: string | number; name?: string; price?: number }>;
    }>('/tickets', credentials.api_key!, token, { 'id_event[]': externalEventId });
    const list = data.tickets ?? [];
    return list.map((t) => ({
      id: String(t.id),
      name: t.name ?? `Tarif ${t.id}`,
      price: t.price ?? null,
      isGuestFriendly: (t.price ?? 0) === 0,
    }));
  },
  async createGuest(credentials, input) {
    // L'API publique Weezevent ne documente pas la création d'invité de façon stable.
    // En live on crée un lien local traçable + barcode dérivé pour import manuel / Zapier.
    if (credentials.__mode === 'sandbox') return sandboxCreateGuest(input);
    const barcode = `WZ-PR360-${input.journalistId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    return {
      externalParticipantId: `pending-${input.journalistId}`,
      barcode,
      raw: {
        note: 'Weezevent live : invité à créer/importer côté billetterie (API write limitée). Barcode réservé pour rapprochement.',
      },
    };
  },
  async listRecentScans(credentials, externalEventId, since) {
    if (credentials.__mode === 'sandbox') return sandboxListScans();
    requireCreds(credentials, ['api_key', 'username', 'password']);
    const token = await accessToken(credentials.api_key!, credentials.username!, credentials.password!);
    const params: Record<string, string> = {
      'id_event[]': externalEventId,
      minimized: '0',
    };
    if (since) {
      const d = new Date(since.getTime() - 60_000);
      params.last_update = d.toISOString().slice(0, 19).replace('T', ' ');
    }
    const data = await wzGet<{
      participants?: Array<{
        id_participant?: string | number;
        id?: string | number;
        barcode?: string;
        owner?: { email?: string };
        control_status?: { status?: string | number; scan_date?: string };
      }>;
    }>('/participant/list', credentials.api_key!, token, params);
    const list = data.participants ?? [];
    return list.map((p) => {
      const status = String(p.control_status?.status ?? '0');
      const scanned = status !== '0' && status !== '';
      const scanDate = p.control_status?.scan_date;
      return {
        externalParticipantId: String(p.id_participant ?? p.id ?? ''),
        barcode: p.barcode ?? null,
        email: p.owner?.email ?? null,
        scanned,
        scannedAt:
          scanned && scanDate && !scanDate.startsWith('0000') ? scanDate.replace(' ', 'T') + 'Z' : null,
      };
    });
  },
};
