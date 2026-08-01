import type { RequestStatus } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { findEventById, isEventMember, listEventMemberIds } from '../db/repositories/eventRepo';
import {
  findRequestById,
  insertRequestNote,
  listHistory,
  listRequestNotes,
  updateRequestAssignment,
} from '../db/repositories/requestRepo';
import { findUserById, listUsersByOrg } from '../db/repositories/userRepo';

export interface Assignee {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export type TimelineItem =
  | {
      kind: 'status';
      at: string;
      status: RequestStatus;
      author: { id: string; fullName: string } | null;
      note: string | null;
    }
  | {
      kind: 'note';
      at: string;
      author: { id: string; fullName: string } | null;
      body: string;
    }
  | {
      kind: 'assignment';
      at: string;
      author: { id: string; fullName: string } | null;
      body: string;
    };

/**
 * Membres assignables sur un événement :
 * - tous les admins actifs de l'organisation ;
 * - + les attachés/assistants membres de l'événement.
 */
export async function listAssignableUsers(eventId: string): Promise<Assignee[]> {
  const event = await findEventById(eventId);
  if (!event) throw AppError.notFound('Événement introuvable');

  const [orgUsers, memberIds] = await Promise.all([
    listUsersByOrg(event.organizationId),
    listEventMemberIds(eventId),
  ]);
  const memberSet = new Set(memberIds);

  return orgUsers
    .filter((u) => u.active && (u.role === 'admin' || memberSet.has(u.id)))
    .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
}

async function assertAssignable(eventId: string, userId: string): Promise<{ fullName: string }> {
  const assignees = await listAssignableUsers(eventId);
  const found = assignees.find((a) => a.id === userId);
  if (!found) throw AppError.badRequest('Utilisateur non assignable sur cet événement');
  return { fullName: found.fullName };
}

/** Pose ou retire l'assignation d'une demande ; journalise une note système. */
export async function assignRequest(input: {
  eventId: string;
  requestId: string;
  userId: string | null;
  actorId: string;
}): Promise<{ assignedTo: { id: string; fullName: string } | null }> {
  const request = await findRequestById(input.requestId);
  if (!request || request.eventId !== input.eventId) {
    throw AppError.notFound('Demande introuvable pour cet événement');
  }

  let assigneeLabel: string | null = null;
  if (input.userId) {
    const a = await assertAssignable(input.eventId, input.userId);
    assigneeLabel = a.fullName;
  }

  const updated = await updateRequestAssignment(input.requestId, input.eventId, input.userId);
  if (!updated) throw AppError.notFound('Demande introuvable');

  const actor = await findUserById(input.actorId);
  const actorName = actor?.fullName ?? 'Un collègue';
  const body = input.userId
    ? `Assigné à ${assigneeLabel} par ${actorName}`
    : `Assignation retirée par ${actorName}`;

  await insertRequestNote({
    requestId: input.requestId,
    eventId: input.eventId,
    authorId: input.actorId,
    body,
    kind: 'assignment',
  });

  return {
    assignedTo: input.userId && assigneeLabel ? { id: input.userId, fullName: assigneeLabel } : null,
  };
}

export async function addRequestNote(input: {
  eventId: string;
  requestId: string;
  authorId: string;
  body: string;
}): Promise<TimelineItem> {
  const body = input.body.trim();
  if (body.length < 1 || body.length > 2000) {
    throw AppError.badRequest('La note doit faire entre 1 et 2000 caractères');
  }
  const request = await findRequestById(input.requestId);
  if (!request || request.eventId !== input.eventId) {
    throw AppError.notFound('Demande introuvable pour cet événement');
  }
  const note = await insertRequestNote({
    requestId: input.requestId,
    eventId: input.eventId,
    authorId: input.authorId,
    body,
    kind: 'note',
  });
  return {
    kind: 'note',
    at: note.createdAt,
    author: note.authorId
      ? { id: note.authorId, fullName: note.authorName ?? 'Utilisateur' }
      : null,
    body: note.body,
  };
}

/** Timeline unifiée : statuts + notes + assignations, tri chronologique. */
export async function getRequestTimeline(
  eventId: string,
  requestId: string,
): Promise<TimelineItem[]> {
  const request = await findRequestById(requestId);
  if (!request || request.eventId !== eventId) {
    throw AppError.notFound('Demande introuvable pour cet événement');
  }

  const [history, notes] = await Promise.all([
    listHistory(requestId),
    listRequestNotes(requestId, eventId),
  ]);

  const items: TimelineItem[] = [];

  for (const h of history) {
    items.push({
      kind: 'status',
      at: h.changedAt,
      status: h.status,
      author: h.changedBy
        ? { id: h.changedBy, fullName: h.changedByName ?? 'Utilisateur' }
        : null,
      note: h.note,
    });
  }
  for (const n of notes) {
    if (n.kind === 'assignment') {
      items.push({
        kind: 'assignment',
        at: n.createdAt,
        author: n.authorId
          ? { id: n.authorId, fullName: n.authorName ?? 'Utilisateur' }
          : null,
        body: n.body,
      });
    } else {
      items.push({
        kind: 'note',
        at: n.createdAt,
        author: n.authorId
          ? { id: n.authorId, fullName: n.authorName ?? 'Utilisateur' }
          : null,
        body: n.body,
      });
    }
  }

  items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return items;
}

/** Vérifie qu'un user a accès événement (pour tests / garde-fous internes). */
export async function userCanAccessEvent(
  eventId: string,
  userId: string,
  organizationId: string,
  role: string,
  isPlatformAdmin: boolean,
): Promise<boolean> {
  if (isPlatformAdmin) return true;
  const event = await findEventById(eventId);
  if (!event || event.organizationId !== organizationId) return false;
  if (role === 'admin') return true;
  return isEventMember(eventId, userId);
}
