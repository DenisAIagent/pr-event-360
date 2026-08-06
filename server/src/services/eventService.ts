import type { EventType, Lang, RequestType, UserRole } from '@pr-event-360/core';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import type { Event, EventConfig } from '../domain';
import {
  findEventById,
  insertConfig,
  insertEvent,
  insertMediaType,
  upsertRequestTypeWeight,
  upsertTemplate,
  getBranding,
  getConfig,
  getRecap,
  addEventMember,
  isEventMember,
  listEventsForOrg,
  listEventsForMember,
  listMediaTypes,
  listRequestTypeWeights,
  listTemplates,
} from '../db/repositories/eventRepo';
import { DEFAULT_TEMPLATE_TEXT } from './notifications/templates';
import {
  insertBillingLedger,
  tryConsumeEventCredit,
} from '../db/repositories/orgBillingRepo';
import { STORAGE_BYTES_20_GB } from '@pr-event-360/core';

/** Identité minimale d'un utilisateur authentifié pour les contrôles d'accès. */
export interface AccessActor {
  sub: string;
  role: UserRole;
  organizationId: string;
  isPlatformAdmin: boolean;
}

/** Texte d'autorisation d'utilisation des photos par défaut (éditable par le RP). */
export const DEFAULT_PHOTO_TERMS =
  "En tant que journaliste accrédité·e, vous êtes autorisé·e à réaliser et utiliser les photos/vidéos uniquement dans le cadre de la publication pour laquelle vous êtes accrédité·e. Vous vous engagez à créditer les personnes ou organisations concernées ainsi que l'événement lors de toute exploitation (presse, web et réseaux sociaux). Toute autre utilisation — commerciale, revente ou cession à un tiers — est interdite sans autorisation écrite préalable. Les consignes de prise de vue communiquées par l'organisation (durée, emplacement et conditions d'accès) doivent être strictement respectées.";

const DEFAULT_CONFIG: EventConfig = {
  itwDurationMin: 15,
  itwBufferMin: 5,
  defaultItwQuota: 3,
  photoQuotaPerStage: 5,
  ageBonusPerHour: 1,
  ageBonusCap: 24,
  photoRule: null,
  onsiteContract: false,
  photoTerms: DEFAULT_PHOTO_TERMS,
};

// Jeu de départ inspiré de l'exemple du PRD ; entièrement éditable ensuite.
const DEFAULT_MEDIA_TYPES = [
  { label: 'TV nationale', weight: 100 },
  { label: 'Presse nationale', weight: 80 },
  { label: 'Radio', weight: 60 },
  { label: 'Presse régionale', weight: 40 },
  { label: 'Web / Blog', weight: 20 },
];

const DEFAULT_TYPE_MULTIPLIERS: Record<RequestType, number> = {
  interview: 1.5,
  video_report: 1.3,
  photo_report: 1.0,
};

export interface CreateEventInput {
  organizationId: string;
  ownerUserId: string;
  name: string;
  eventType: EventType;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  languages: Lang[];
  config?: Partial<EventConfig>;
}

/**
 * Crée un événement ET sème sa configuration par défaut de façon ATOMIQUE :
 * config, poids de média, multiplicateurs de type, et templates email pour
 * chaque langue active. Tout est éditable après coup.
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  return withTransaction(async (db) => {
    // Licence commerciale : 1 crédit = 1 événement (null balance = legacy illimité).
    const credit = await tryConsumeEventCredit(input.organizationId, db);
    if (!credit.ok) {
      throw AppError.paymentRequired(credit.reason ?? 'Crédit événement requis', {
        code: 'EVENT_CREDIT_REQUIRED',
      });
    }

    const event = await insertEvent(
      {
        organizationId: input.organizationId,
        ownerUserId: input.ownerUserId,
        name: input.name,
        eventType: input.eventType,
        location: input.location,
        startDate: input.startDate,
        endDate: input.endDate,
        languages: input.languages,
        storageQuotaBytes: STORAGE_BYTES_20_GB,
      },
      db,
    );

    await insertBillingLedger(
      {
        organizationId: input.organizationId,
        planCode: 'event_consume',
        creditsDelta: -1,
        eventId: event.id,
        note: 'Consommation licence à la création d’événement',
      },
      db,
    );

    await insertConfig(event.id, { ...DEFAULT_CONFIG, ...input.config }, db);

    for (const mt of DEFAULT_MEDIA_TYPES) {
      await insertMediaType({ eventId: event.id, label: mt.label, weight: mt.weight }, db);
    }

    for (const [type, multiplier] of Object.entries(DEFAULT_TYPE_MULTIPLIERS)) {
      await upsertRequestTypeWeight(event.id, type as RequestType, multiplier, db);
    }

    // Templates email par défaut pour chaque (langue active × déclencheur).
    for (const lang of input.languages) {
      for (const [triggerKey, byLang] of Object.entries(DEFAULT_TEMPLATE_TEXT)) {
        const text = byLang[lang];
        await upsertTemplate(
          { eventId: event.id, lang, triggerKey, channel: 'email', subject: text.subject, body: text.body },
          db,
        );
      }
    }

    // Le créateur est automatiquement membre de son événement (accès garanti).
    await addEventMember(event.id, input.ownerUserId, db);

    return event;
  });
}

/**
 * Liste les événements visibles par l'utilisateur, **scopés à son organisation** :
 * un admin d'org voit tous les événements de SON organisation ; les autres rôles
 * uniquement ceux où ils sont assignés (membres, eux-mêmes bornés à l'org).
 */
export async function listEventsForUserService(actor: AccessActor): Promise<Event[]> {
  return actor.role === 'admin'
    ? listEventsForOrg(actor.organizationId)
    : listEventsForMember(actor.sub);
}

/** Charge un événement ou lève 404. */
export async function getEventOrThrow(eventId: string): Promise<Event> {
  const event = await findEventById(eventId);
  if (!event) throw AppError.notFound('Événement introuvable');
  return event;
}

/**
 * Charge un événement en vérifiant l'accès, AVEC isolation multi-locataire :
 * 1) l'événement doit appartenir à l'organisation de l'utilisateur (sauf super-admin
 *    plateforme) — sinon 404, pour ne pas révéler l'existence d'un événement d'un autre client ;
 * 2) ensuite : admin d'org = accès ; autres rôles = doivent être membres (assignés).
 */
export async function getAccessibleEventOrThrow(eventId: string, actor: AccessActor): Promise<Event> {
  const event = await getEventOrThrow(eventId);
  if (event.organizationId !== actor.organizationId && !actor.isPlatformAdmin) {
    throw AppError.notFound('Événement introuvable');
  }
  if (actor.role === 'admin' || actor.isPlatformAdmin) return event;
  const member = await isEventMember(eventId, actor.sub);
  // 404 et non 403 : un 403 confirmerait l'existence de l'événement dans l'organisation
  // (un membre restreint pouvait ainsi énumérer les événements clients auxquels il n'est
  // pas assigné). Réponse identique au cas cross-tenant → aucun oracle d'existence.
  if (!member) throw AppError.notFound('Événement introuvable');
  return event;
}

/** Configuration complète (config + poids + multiplicateurs + templates + branding + récap). */
export async function getEventSettings(eventId: string) {
  const [config, mediaTypes, typeWeights, templates, branding, recap] = await Promise.all([
    getConfig(eventId),
    listMediaTypes(eventId),
    listRequestTypeWeights(eventId),
    listTemplates(eventId),
    getBranding(eventId),
    getRecap(eventId),
  ]);
  if (!config) throw AppError.notFound('Configuration introuvable');
  return { config, mediaTypes, typeWeights, templates, branding, recap };
}

/** Les inscriptions sont-elles closes (date de clôture dépassée) ? */
export function isRegistrationClosed(event: Event, nowMs: number): boolean {
  if (!event.accreditationDeadline) return false;
  return nowMs > Date.parse(event.accreditationDeadline);
}
