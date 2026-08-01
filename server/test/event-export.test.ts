import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/services/accreditationService', () => ({
  listAccreditations: vi.fn(),
}));
vi.mock('../src/services/queueService', () => ({
  getQueue: vi.fn(),
}));
vi.mock('../src/db/repositories/coverageRepo', () => ({
  listCoverageByEvent: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventById: vi.fn(),
  getBranding: vi.fn(),
}));

import { listAccreditations } from '../src/services/accreditationService';
import { getQueue } from '../src/services/queueService';
import { listCoverageByEvent } from '../src/db/repositories/coverageRepo';
import { findEventById, getBranding } from '../src/db/repositories/eventRepo';
import {
  buildEventBilan,
  exportAccreditationsCsv,
  exportCoverageCsv,
  exportPlanningCsv,
  exportRequestsCsv,
} from '../src/services/eventExportService';

const journalist = {
  id: 'j1',
  eventId: 'e1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@media.test',
  phone: '0600000000',
  media: 'Le Quotidien',
  mediaTypeId: null,
  audience: null,
  prevArticle: null,
  lang: 'fr' as const,
  accreditationType: 'presse' as const,
  accStatus: 'acceptee' as const,
  commitPublish: true,
  publishDelayDays: 8,
  consent: true,
  passwordHash: 'secret',
  createdAt: '2026-06-01T10:00:00.000Z',
};

const queueItem = {
  id: 'r1',
  type: 'interview' as const,
  status: 'acceptee' as const,
  score: 42,
  message: 'Dispo matin',
  createdAt: '2026-06-02T10:00:00.000Z',
  requester: {
    id: 'j1',
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'lea@media.test',
    media: 'Le Quotidien',
  },
  subject: {
    artistId: 'a1',
    artistName: 'Artiste X',
    stageId: 's1',
    stageName: 'Scène 1',
    slot: '10:00–10:20',
    slotDay: '2026-08-01',
    slotStart: '10:00',
    slotEnd: '10:20',
  },
  quota: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAccreditations).mockResolvedValue([journalist] as never);
  vi.mocked(getQueue).mockResolvedValue([queueItem] as never);
  vi.mocked(listCoverageByEvent).mockResolvedValue([
    {
      id: 'c1',
      eventId: 'e1',
      journalistId: 'j1',
      mediaCategory: 'web',
      isUpload: false,
      url: 'https://example.com/article',
      thumbnailUrl: null,
      title: 'Chronique',
      archiveConsent: false,
      promoConsent: false,
      createdAt: '2026-08-05T12:00:00.000Z',
    },
  ] as never);
  vi.mocked(findEventById).mockResolvedValue({
    id: 'e1',
    name: 'Festival Test',
    location: 'Paris',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    eventType: 'music',
  } as never);
  vi.mocked(getBranding).mockResolvedValue({
    logoUrl: null,
    accentColor: '#1598d3',
    bgColor: null,
    textColor: null,
    bgImageUrl: null,
  } as never);
});

describe('exports CSV événement', () => {
  it('exporte les accréditations sans hash de mot de passe', async () => {
    const csv = await exportAccreditationsCsv('e1');
    expect(csv).toContain('Léa');
    expect(csv).toContain('lea@media.test');
    expect(csv).not.toContain('secret');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('exporte les demandes avec score et créneau', async () => {
    const csv = await exportRequestsCsv('e1');
    expect(csv).toContain('Interview');
    expect(csv).toContain('42');
    expect(csv).toContain('Artiste X');
    expect(csv).toContain('2026-08-01');
  });

  it('le planning ne garde que les interviews acceptées avec créneau', async () => {
    vi.mocked(getQueue).mockResolvedValue([
      queueItem,
      {
        ...queueItem,
        id: 'r2',
        subject: { ...queueItem.subject, slotDay: null, slotStart: null, slotEnd: null },
      },
    ] as never);
    const csv = await exportPlanningCsv('e1');
    expect(csv).toContain('r1');
    expect(csv).not.toContain('r2');
    expect(getQueue).toHaveBeenCalledWith('e1', { type: 'interview', status: 'acceptee' });
  });

  it('exporte les retombées avec le nom du journaliste', async () => {
    const csv = await exportCoverageCsv('e1');
    expect(csv).toContain('Léa Martin');
    expect(csv).toContain('https://example.com/article');
    expect(csv).toContain('web');
  });
});

describe('bilan presse', () => {
  it('agrège KPIs et highlights', async () => {
    const bilan = await buildEventBilan('e1');
    expect(bilan.event.name).toBe('Festival Test');
    expect(bilan.kpis.journalistsTotal).toBe(1);
    expect(bilan.kpis.byAccStatus.acceptee).toBe(1);
    expect(bilan.kpis.requestsTotal).toBe(1);
    expect(bilan.kpis.coverageTotal).toBe(1);
    expect(bilan.kpis.contributorsCount).toBe(1);
    expect(bilan.kpis.pendingCoverageCount).toBe(0);
    expect(bilan.highlights.topMedia[0]?.name).toBe('Le Quotidien');
    expect(bilan.highlights.topParticipants[0]?.name).toBe('Artiste X');
    expect(bilan.branding?.accentColor).toBe('#1598d3');
  });
});
