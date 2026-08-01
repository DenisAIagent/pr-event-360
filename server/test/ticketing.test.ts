import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/crypto', () => ({
  isEncryptionAvailable: () => true,
  encryptSecret: (s: string) => `enc:${s}`,
  decryptSecret: (s: string) => s.replace(/^enc:/, ''),
}));

vi.mock('../src/db/repositories/ticketingRepo', () => ({
  findTicketingConnection: vi.fn(),
  upsertTicketingConnection: vi.fn(),
  updateTicketingConnectionStatus: vi.fn(),
  deleteTicketingConnection: vi.fn(),
  findJournalistTicketingLink: vi.fn(),
  listJournalistTicketingLinks: vi.fn(async () => []),
  upsertJournalistTicketingLink: vi.fn(),
  deleteJournalistTicketingLink: vi.fn(),
  countTicketingLinks: vi.fn(async () => ({ total: 0, scanned: 0 })),
  listConnectedTicketingEvents: vi.fn(async () => []),
}));

vi.mock('../src/services/eventService', () => ({
  getEventOrThrow: vi.fn(async (id: string) => ({ id, name: 'Fest' })),
}));

vi.mock('../src/db/repositories/journalistRepo', () => ({
  findJournalistById: vi.fn(),
  listJournalistsByEvent: vi.fn(async () => []),
  setJournalistCheckedIn: vi.fn(),
}));

import { getTicketingCatalog, getTicketingStatus, saveTicketingConnection } from '../src/services/ticketing/ticketingService';
import * as repo from '../src/db/repositories/ticketingRepo';

describe('ticketing catalog', () => {
  it('expose les 4 providers avec champs credentials', () => {
    const cat = getTicketingCatalog();
    expect(cat.map((p) => p.id).sort()).toEqual(['billetweb', 'eventbrite', 'shotgun', 'weezevent']);
    for (const p of cat) {
      expect(p.credentialFields.length).toBeGreaterThan(0);
      expect(p.docsUrl).toMatch(/^https?:\/\//);
    }
  });
});

describe('ticketing status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne disconnected si aucune connexion', async () => {
    vi.mocked(repo.findTicketingConnection).mockResolvedValue(null);
    const s = await getTicketingStatus('e1');
    expect(s.connected).toBe(false);
    expect(s.providers.length).toBe(4);
  });
});

describe('saveTicketingConnection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chiffre et upsert en sandbox', async () => {
    vi.mocked(repo.findTicketingConnection).mockResolvedValue(null);
    vi.mocked(repo.upsertTicketingConnection).mockResolvedValue({
      event_id: 'e1',
      provider: 'weezevent',
      credentials_encrypted: 'enc:{}',
      external_event_id: null,
      external_event_name: null,
      external_ticket_id: null,
      external_ticket_name: null,
      auto_provision: true,
      auto_sync_checkin: true,
      mode: 'sandbox',
      status: 'disconnected',
      last_error: null,
      last_sync_at: null,
      last_test_at: null,
      created_at: 'now',
      updated_at: 'now',
    });
    await saveTicketingConnection('e1', {
      provider: 'weezevent',
      mode: 'sandbox',
      credentials: { sandbox: '1' },
    });
    expect(repo.upsertTicketingConnection).toHaveBeenCalledOnce();
    const arg = vi.mocked(repo.upsertTicketingConnection).mock.calls[0]![0];
    expect(arg.credentialsEncrypted.startsWith('enc:')).toBe(true);
    expect(arg.mode).toBe('sandbox');
  });
});
