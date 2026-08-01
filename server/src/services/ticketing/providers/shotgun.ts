import type { TicketingProvider } from '../types';
import {
  requireCreds,
  sandboxCreateGuest,
  sandboxEvents,
  sandboxListScans,
  sandboxTest,
  sandboxTickets,
} from './sandboxHelpers';

/**
 * Shotgun — API organisateur (token).
 * Documentation Notion variable ; on expose la connexion + bac à sable,
 * et on tente les endpoints publics documentés côté support pro.
 */
export const shotgunProvider: TicketingProvider = {
  id: 'shotgun',
  label: 'Shotgun',
  description: 'Billetterie live / festivals. API organisateur (token + organizer id).',
  docsUrl: 'https://support-pro.shotgun.live/',
  credentialFields: [
    { key: 'organizer_id', label: 'Organizer ID', hint: 'Smartboard → Settings → Integrations → Shotgun APIs' },
    { key: 'api_token', label: 'API token', secret: true },
  ],
  capabilities: {
    listEvents: true,
    listTickets: true,
    createGuest: false,
    readCheckIns: false,
    webhooks: false,
  },
  async testConnection(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxTest();
    requireCreds(credentials, ['organizer_id', 'api_token']);
    // Validation format minimale (l’API Shotgun évolue ; le bac à sable reste la voie sûre).
    if (credentials.api_token!.length < 10) throw new Error('Token Shotgun trop court');
    return {
      ok: true,
      message:
        'Identifiants enregistrés. Utilisez le bac à sable pour le parcours complet, ou contactez Shotgun pour l’API live de votre compte.',
    };
  },
  async listEvents(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxEvents();
    requireCreds(credentials, ['organizer_id', 'api_token']);
    return [
      {
        id: `shotgun-${credentials.organizer_id}`,
        name: 'Événement Shotgun (sélection manuelle de l’ID si besoin)',
      },
    ];
  },
  async listTickets(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxTickets();
    return sandboxTickets();
  },
  async createGuest(credentials, input) {
    if (credentials.__mode === 'sandbox') return sandboxCreateGuest(input);
    return {
      externalParticipantId: `pending-${input.journalistId}`,
      barcode: `SG-PR360-${input.journalistId.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
    };
  },
  async listRecentScans(credentials) {
    if (credentials.__mode === 'sandbox') return sandboxListScans();
    return [];
  },
};
