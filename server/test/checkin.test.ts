import { describe, expect, it, vi, beforeEach } from 'vitest';
import { encodeCheckInCode, decodeCheckInCode } from '../src/lib/checkInCode';

// JWT_SECRET requis par loadEnv au decode — les tests serveur chargent déjà .env via dotenv-cli.
vi.mock('../src/db/repositories/journalistRepo', () => ({
  findJournalistById: vi.fn(),
  setJournalistCheckedIn: vi.fn(),
  clearJournalistCheckedIn: vi.fn(),
  listJournalistsByEvent: vi.fn(),
  countCheckedInByEvent: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventById: vi.fn(),
  getBranding: vi.fn(),
}));
vi.mock('../src/services/queueService', () => ({
  getQueue: vi.fn(),
}));
vi.mock('../src/db/repositories/pressConferenceRepo', () => ({
  listPressConferences: vi.fn(),
}));

import { findJournalistById, setJournalistCheckedIn } from '../src/db/repositories/journalistRepo';
import { findEventById, getBranding } from '../src/db/repositories/eventRepo';
import { getQueue } from '../src/services/queueService';
import { listPressConferences } from '../src/db/repositories/pressConferenceRepo';
import { countCheckedInByEvent, listJournalistsByEvent } from '../src/db/repositories/journalistRepo';
import {
  buildJournalistBadge,
  checkInArrival,
  getDayOfSnapshot,
} from '../src/services/dayOfService';
import { AppError } from '../src/http/AppError';

describe('check-in code HMAC', () => {
  it('encode / decode round-trip', () => {
    const code = encodeCheckInCode('event-uuid-1', 'journalist-uuid-1');
    expect(code.startsWith('pr360ci1.')).toBe(true);
    const decoded = decodeCheckInCode(code);
    expect(decoded).toEqual({ eventId: 'event-uuid-1', journalistId: 'journalist-uuid-1' });
  });

  it('rejette une signature altérée', () => {
    const code = encodeCheckInCode('e1', 'j1');
    const bad = code.slice(0, -4) + 'xxxx';
    expect(decodeCheckInCode(bad)).toBeNull();
  });
});

describe('checkInArrival', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      firstName: 'Léa',
      lastName: 'M',
      email: 'l@t',
      media: 'Media',
      accreditationType: 'presse',
      accStatus: 'acceptee',
      checkedInAt: null,
    } as never);
    vi.mocked(setJournalistCheckedIn).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      firstName: 'Léa',
      lastName: 'M',
      email: 'l@t',
      media: 'Media',
      accreditationType: 'presse',
      accStatus: 'acceptee',
      checkedInAt: '2026-08-01T09:00:00.000Z',
    } as never);
  });

  it('check-in par id', async () => {
    const r = await checkInArrival('e1', { journalistId: 'j1' });
    expect(r.alreadyCheckedIn).toBe(false);
    expect(r.journalist.checkedInAt).toBeTruthy();
    expect(setJournalistCheckedIn).toHaveBeenCalled();
  });

  it('est idempotent si déjà check-in', async () => {
    vi.mocked(findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      firstName: 'Léa',
      lastName: null,
      email: 'l@t',
      media: null,
      accreditationType: 'presse',
      accStatus: 'acceptee',
      checkedInAt: '2026-08-01T08:00:00.000Z',
    } as never);
    const r = await checkInArrival('e1', { journalistId: 'j1' });
    expect(r.alreadyCheckedIn).toBe(true);
    expect(setJournalistCheckedIn).not.toHaveBeenCalled();
  });

  it('refuse un code d’un autre événement', async () => {
    const code = encodeCheckInCode('other-event', 'j1');
    await expect(checkInArrival('e1', { code })).rejects.toBeInstanceOf(AppError);
  });

  it('refuse une accréditation non acceptée', async () => {
    vi.mocked(findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      accStatus: 'pas_encore_traite',
      checkedInAt: null,
    } as never);
    await expect(checkInArrival('e1', { journalistId: 'j1' })).rejects.toBeInstanceOf(AppError);
  });
});

describe('getDayOfSnapshot', () => {
  it('agrège interviews et conférences du jour', async () => {
    vi.mocked(findEventById).mockResolvedValue({
      id: 'e1',
      name: 'Fest',
      location: 'Paris',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    } as never);
    vi.mocked(listJournalistsByEvent).mockResolvedValue([
      {
        id: 'j1',
        accStatus: 'acceptee',
        firstName: 'A',
        lastName: null,
        email: 'a@t',
        media: null,
        accreditationType: 'presse',
        checkedInAt: null,
      },
    ] as never);
    vi.mocked(countCheckedInByEvent).mockResolvedValue(0);
    vi.mocked(getQueue).mockResolvedValue([
      {
        id: 'r1',
        status: 'acceptee',
        requester: { firstName: 'A', lastName: null, email: 'a@t', media: null },
        subject: {
          artistName: 'Artiste',
          slotDay: '2026-08-01',
          slotStart: '10:00',
          slotEnd: '10:20',
        },
        assignedTo: null,
      },
    ] as never);
    vi.mocked(listPressConferences).mockResolvedValue([
      {
        id: 'c1',
        title: 'CP',
        startsAt: '2026-08-01T14:00:00.000Z',
        endsAt: null,
        venue: 'Salle A',
        status: 'published',
      },
    ] as never);

    const snap = await getDayOfSnapshot('e1', '2026-08-01');
    expect(snap.stats.accredited).toBe(1);
    expect(snap.stats.interviewsToday).toBe(1);
    expect(snap.stats.conferencesToday).toBe(1);
    expect(snap.interviews[0]?.participant).toBe('Artiste');
  });
});

describe('buildJournalistBadge', () => {
  it('génère un QR data URL', async () => {
    vi.mocked(findEventById).mockResolvedValue({ id: 'e1', name: 'Fest', location: null } as never);
    vi.mocked(findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      firstName: 'Léa',
      lastName: null,
      email: 'l@t',
      media: 'M',
      accreditationType: 'presse',
      accStatus: 'acceptee',
      checkedInAt: null,
    } as never);
    vi.mocked(getBranding).mockResolvedValue({ logoUrl: null, accentColor: '#1598d3' } as never);

    const badge = await buildJournalistBadge('e1', 'j1');
    expect(badge.qrDataUrl.startsWith('data:image/png')).toBe(true);
    expect(decodeCheckInCode(badge.code)?.journalistId).toBe('j1');
  });
});
