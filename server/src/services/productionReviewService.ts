import type { RequestStatus, RequestType } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { listEnrichedByEvent } from '../db/repositories/requestRepo';
import { getBranding, findEventById } from '../db/repositories/eventRepo';
import {
  reviewsByContact,
  upsertRequestReview,
  type ProductionContact,
  type ReviewVerdict,
} from '../db/repositories/productionRepo';
import type { EventBranding } from '../domain';

/**
 * Une demande telle que la voit un contact production.
 *
 * Volontairement plus pauvre que `QueueItem` : ni score (il encode la
 * pondération éditoriale interne de l'attaché), ni email ou téléphone du
 * journaliste. La prod a besoin de savoir QUI demande, pour QUEL média et QUAND
 * — pas de la mécanique de priorisation.
 */
export interface ProductionRequestItem {
  id: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  message: string | null;
  journalistName: string;
  media: string | null;
  artistId: string;
  artistName: string | null;
  slot: string | null;
  review: { verdict: ReviewVerdict; comment: string | null; at: string } | null;
}

export interface ProductionSpacePayload {
  contact: { name: string };
  event: { name: string; branding: EventBranding };
  artists: { id: string; name: string | null }[];
  requests: ProductionRequestItem[];
}

function formatSlot(day: string | null, start: string | null, end: string | null): string | null {
  if (!day || !start) return null;
  return end ? `${day} ${start.slice(0, 5)}–${end.slice(0, 5)}` : `${day} ${start.slice(0, 5)}`;
}

/** Charge l'espace d'un contact : ses artistes et les demandes qui les visent. */
export async function buildProductionSpace(contact: ProductionContact): Promise<ProductionSpacePayload> {
  const event = await findEventById(contact.eventId);
  if (!event) throw AppError.notFound('Événement introuvable');
  const [branding, rows, existing] = await Promise.all([
    getBranding(contact.eventId),
    listEnrichedByEvent(contact.eventId),
    reviewsByContact(contact.id),
  ]);

  const scope = new Set(contact.artistIds);
  const requests = rows
    .filter((r) => r.artistId && scope.has(r.artistId))
    // La liste d'attente est une mécanique interne de quota : l'exposer ferait
    // arbitrer la prod sur des demandes que l'attaché n'a pas retenues.
    .filter((r) => r.status !== 'liste_attente')
    .map((r): ProductionRequestItem => {
      const review = existing.get(r.id);
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
        message: r.message,
        journalistName: [r.journalistFirstName, r.journalistLastName].filter(Boolean).join(' '),
        media: r.journalistMedia,
        artistId: r.artistId!,
        artistName: r.artistName,
        slot: formatSlot(r.slotDay, r.slotStart, r.slotEnd),
        review: review
          ? { verdict: review.verdict, comment: review.comment, at: review.at.toISOString() }
          : null,
      };
    });

  const artists = [...new Map(requests.map((r) => [r.artistId, r.artistName])).entries()].map(([id, name]) => ({
    id,
    name,
  }));

  return {
    contact: { name: contact.name },
    event: { name: event.name, branding },
    artists,
    requests,
  };
}

/**
 * Enregistre l'avis d'un contact sur une demande.
 *
 * Ne touche NI au statut, NI aux quotas, NI à la liste d'attente : l'avis est
 * consultatif et l'attaché de presse reste seul décisionnaire. C'est aussi ce
 * qui rend l'écriture externe sans danger pour le pipeline.
 */
export async function submitProductionReview(input: {
  contact: ProductionContact;
  requestId: string;
  verdict: ReviewVerdict;
  comment: string | null;
}): Promise<void> {
  const rows = await listEnrichedByEvent(input.contact.eventId);
  const target = rows.find((r) => r.id === input.requestId);
  const scope = new Set(input.contact.artistIds);
  // Un identifiant hors périmètre est traité comme inexistant : pas d'oracle
  // permettant de deviner les demandes des autres artistes.
  if (!target || !target.artistId || !scope.has(target.artistId)) {
    throw AppError.notFound('Demande introuvable');
  }

  const comment = input.comment?.trim() ? input.comment.trim().slice(0, 2000) : null;
  await upsertRequestReview({
    requestId: target.id,
    eventId: input.contact.eventId,
    contactId: input.contact.id,
    verdict: input.verdict,
    comment,
  });
}
