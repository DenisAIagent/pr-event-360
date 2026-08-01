import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventById: vi.fn(),
  isEventMember: vi.fn(),
  listEventMemberIds: vi.fn(),
}));
vi.mock('../src/db/repositories/requestRepo', () => ({
  findRequestById: vi.fn(),
  updateRequestAssignment: vi.fn(),
  insertRequestNote: vi.fn(),
  listHistory: vi.fn(),
  listRequestNotes: vi.fn(),
}));
vi.mock('../src/db/repositories/userRepo', () => ({
  findUserById: vi.fn(),
  listUsersByOrg: vi.fn(),
}));
// Le fil fusionne désormais les avis production : sans ce mock, le test
// interrogerait la vraie base.
vi.mock('../src/db/repositories/productionRepo', () => ({
  listRequestReviews: vi.fn(),
}));

import { findEventById, listEventMemberIds } from '../src/db/repositories/eventRepo';
import {
  findRequestById,
  insertRequestNote,
  listHistory,
  listRequestNotes,
  updateRequestAssignment,
} from '../src/db/repositories/requestRepo';
import { findUserById, listUsersByOrg } from '../src/db/repositories/userRepo';
import { listRequestReviews } from '../src/db/repositories/productionRepo';
import {
  addRequestNote,
  assignRequest,
  getRequestTimeline,
  listAssignableUsers,
} from '../src/services/collabService';
import { AppError } from '../src/http/AppError';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listRequestReviews).mockResolvedValue([]);
  vi.mocked(findEventById).mockResolvedValue({
    id: 'e1',
    organizationId: 'org1',
    name: 'Fest',
  } as never);
  vi.mocked(listUsersByOrg).mockResolvedValue([
    {
      id: 'u-admin',
      fullName: 'Admin Org',
      email: 'a@test',
      role: 'admin',
      active: true,
      organizationId: 'org1',
    },
    {
      id: 'u-att',
      fullName: 'Attaché',
      email: 'b@test',
      role: 'attache',
      active: true,
      organizationId: 'org1',
    },
    {
      id: 'u-out',
      fullName: 'Hors event',
      email: 'c@test',
      role: 'assistant',
      active: true,
      organizationId: 'org1',
    },
  ] as never);
  vi.mocked(listEventMemberIds).mockResolvedValue(['u-att']);
  vi.mocked(findRequestById).mockResolvedValue({
    id: 'r1',
    eventId: 'e1',
    status: 'pas_encore_traite',
  } as never);
  vi.mocked(findUserById).mockResolvedValue({ id: 'u-admin', fullName: 'Admin Org' } as never);
  vi.mocked(updateRequestAssignment).mockResolvedValue({ id: 'r1' } as never);
  vi.mocked(insertRequestNote).mockResolvedValue({
    id: 'n1',
    requestId: 'r1',
    eventId: 'e1',
    authorId: 'u-admin',
    authorName: 'Admin Org',
    body: 'Note',
    kind: 'note',
    createdAt: '2026-08-01T10:00:00.000Z',
  } as never);
  vi.mocked(listHistory).mockResolvedValue([
    {
      id: 'h1',
      requestId: 'r1',
      status: 'acceptee',
      changedAt: '2026-08-01T09:00:00.000Z',
      changedBy: 'u-admin',
      changedByName: 'Admin Org',
      note: 'OK',
    },
  ] as never);
  vi.mocked(listRequestNotes).mockResolvedValue([
    {
      id: 'n1',
      requestId: 'r1',
      eventId: 'e1',
      authorId: 'u-att',
      authorName: 'Attaché',
      body: 'Relancer demain',
      kind: 'note',
      createdAt: '2026-08-01T11:00:00.000Z',
    },
    {
      id: 'n2',
      requestId: 'r1',
      eventId: 'e1',
      authorId: 'u-admin',
      authorName: 'Admin Org',
      body: 'Assigné à Attaché',
      kind: 'assignment',
      createdAt: '2026-08-01T10:30:00.000Z',
    },
  ] as never);
});

describe('listAssignableUsers', () => {
  it('inclut les admins org et les membres de l’événement uniquement', async () => {
    const list = await listAssignableUsers('e1');
    const ids = list.map((a) => a.id);
    expect(ids).toContain('u-admin');
    expect(ids).toContain('u-att');
    expect(ids).not.toContain('u-out');
  });
});

describe('assignRequest', () => {
  it('refuse un user hors périmètre', async () => {
    await expect(
      assignRequest({ eventId: 'e1', requestId: 'r1', userId: 'u-out', actorId: 'u-admin' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('assigne et journalise une note assignment', async () => {
    const result = await assignRequest({
      eventId: 'e1',
      requestId: 'r1',
      userId: 'u-att',
      actorId: 'u-admin',
    });
    expect(result.assignedTo).toEqual({ id: 'u-att', fullName: 'Attaché' });
    expect(insertRequestNote).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'assignment', requestId: 'r1' }),
    );
  });
});

describe('addRequestNote', () => {
  it('refuse une note vide', async () => {
    await expect(
      addRequestNote({ eventId: 'e1', requestId: 'r1', authorId: 'u-admin', body: '   ' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('ajoute une note timeline', async () => {
    const item = await addRequestNote({
      eventId: 'e1',
      requestId: 'r1',
      authorId: 'u-admin',
      body: 'Appeler le média',
    });
    expect(item.kind).toBe('note');
    expect(item).toMatchObject({ body: 'Note' });
  });
});

describe('getRequestTimeline', () => {
  it('fusionne et trie status + notes + assignations', async () => {
    const timeline = await getRequestTimeline('e1', 'r1');
    expect(timeline.map((t) => t.kind)).toEqual(['status', 'assignment', 'note']);
    expect(timeline[0]).toMatchObject({ kind: 'status', status: 'acceptee' });
  });

  it('404 si la demande est d’un autre événement', async () => {
    vi.mocked(findRequestById).mockResolvedValue({ id: 'r1', eventId: 'other' } as never);
    await expect(getRequestTimeline('e1', 'r1')).rejects.toBeInstanceOf(AppError);
  });
});
