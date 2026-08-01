import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/db/repositories/requestRepo', () => ({
  listEnrichedByEvent: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventById: vi.fn(),
  getBranding: vi.fn(),
}));
vi.mock('../src/db/repositories/productionRepo', () => ({
  reviewsByContact: vi.fn(),
  upsertRequestReview: vi.fn(),
}));

import { listEnrichedByEvent } from '../src/db/repositories/requestRepo';
import { findEventById, getBranding } from '../src/db/repositories/eventRepo';
import { reviewsByContact, upsertRequestReview } from '../src/db/repositories/productionRepo';
import {
  buildProductionSpace,
  submitProductionReview,
} from '../src/services/productionReviewService';
import type { ProductionContact } from '../src/db/repositories/productionRepo';

const contact: ProductionContact = {
  id: 'c1',
  eventId: 'e1',
  name: 'Manager A',
  jobTitle: 'Régisseur de tournée',
  email: 'manager@prod.test',
  tokenExpiresAt: null,
  lastSentAt: null,
  createdAt: new Date(),
  artistIds: ['artist-A'],
};

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'r1',
    type: 'interview',
    status: 'pas_encore_traite',
    message: 'Bonjour',
    createdAt: '2026-08-01T10:00:00.000Z',
    createdAtMs: 0,
    journalistId: 'j1',
    journalistFirstName: 'Léa',
    journalistLastName: 'Martin',
    journalistEmail: 'lea@media.test',
    journalistMedia: 'Le Monde',
    journalistLang: 'fr',
    mediaWeight: 100,
    typeMultiplier: 1,
    artistId: 'artist-A',
    artistName: 'Artiste A',
    stageId: null,
    stageName: null,
    slotId: null,
    slotDay: null,
    slotStart: null,
    slotEnd: null,
    assignedToId: null,
    assignedToName: null,
    notesCount: 0,
    ...over,
  };
}

beforeEach(() => {
  // Sans ceci, l'historique d'appels fuit d'un test à l'autre et les assertions
  // « n'a pas été appelé » passent à tort.
  vi.clearAllMocks();
  vi.mocked(findEventById).mockResolvedValue({ id: 'e1', name: 'Festival' } as never);
  vi.mocked(getBranding).mockResolvedValue({ logoUrl: null, accentColor: null } as never);
  vi.mocked(reviewsByContact).mockResolvedValue(new Map());
  vi.mocked(upsertRequestReview).mockResolvedValue(undefined as never);
});

describe('espace production — périmètre', () => {
  it('ne montre que les demandes des artistes rattachés au contact', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([
      row(),
      row({ id: 'r2', artistId: 'artist-B', artistName: 'Artiste B' }),
    ] as never);

    const space = await buildProductionSpace(contact);

    expect(space.requests.map((r) => r.id)).toEqual(['r1']);
    expect(space.artists.map((a) => a.id)).toEqual(['artist-A']);
  });

  it('masque la liste d’attente, mécanique interne de quota', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([
      row({ id: 'r3', status: 'liste_attente' }),
    ] as never);

    const space = await buildProductionSpace(contact);
    expect(space.requests).toHaveLength(0);
  });

  it('n’expose jamais le score ni les coordonnées du journaliste', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([row()] as never);

    const space = await buildProductionSpace(contact);
    const serialized = JSON.stringify(space);

    expect(serialized).not.toContain('score');
    expect(serialized).not.toContain('lea@media.test');
    expect(space.requests[0]!.journalistName).toBe('Léa Martin');
  });
});

describe('espace production — enregistrement de l’avis', () => {
  it('enregistre l’avis d’une demande du périmètre', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([row()] as never);

    await submitProductionReview({
      contact,
      requestId: 'r1',
      verdict: 'favorable',
      comment: '  Volontiers  ',
    });

    expect(upsertRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'r1',
        contactId: 'c1',
        eventId: 'e1',
        verdict: 'favorable',
        comment: 'Volontiers',
      }),
    );
  });

  it('refuse une demande hors périmètre sans révéler son existence', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([
      row({ id: 'r2', artistId: 'artist-B', artistName: 'Artiste B' }),
    ] as never);

    await expect(
      submitProductionReview({ contact, requestId: 'r2', verdict: 'favorable', comment: null }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(upsertRequestReview).not.toHaveBeenCalled();
  });

  it('traite un commentaire vide comme absent', async () => {
    vi.mocked(listEnrichedByEvent).mockResolvedValue([row()] as never);

    await submitProductionReview({ contact, requestId: 'r1', verdict: 'defavorable', comment: '   ' });

    expect(upsertRequestReview).toHaveBeenCalledWith(expect.objectContaining({ comment: null }));
  });
});
