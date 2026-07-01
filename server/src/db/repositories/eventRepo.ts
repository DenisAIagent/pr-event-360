import { pool } from '../pool';
import type { Queryable } from '../types';
import type {
  Event,
  EventBranding,
  EventConfig,
  EventRecap,
  MediaType,
  RecapFrequency,
  RequestTypeWeight,
  EmailTemplate,
} from '../../domain';
import type { Lang, RequestType } from '@pr-event-360/core';

interface EventRow {
  id: string;
  organization_id: string;
  owner_user_id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  languages: Lang[];
  accreditation_deadline: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  subdomain_slug: string | null;
  created_at: string;
}
/**
 * node-pg ne fournit pas de parseur pour les tableaux d'ENUM (lang_code[]) :
 * il renvoie le littéral Postgres brut "{fr,en}". On le normalise en tableau.
 */
function parseLangArray(value: Lang[] | string): Lang[] {
  if (Array.isArray(value)) return value;
  return value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Lang[];
}

const mapEvent = (r: EventRow): Event => ({
  id: r.id,
  organizationId: r.organization_id,
  ownerUserId: r.owner_user_id,
  name: r.name,
  location: r.location,
  startDate: r.start_date,
  endDate: r.end_date,
  languages: parseLangArray(r.languages),
  accreditationDeadline: r.accreditation_deadline,
  customDomain: r.custom_domain,
  customDomainVerified: r.custom_domain_verified,
  subdomainSlug: r.subdomain_slug,
  createdAt: r.created_at,
});

interface ConfigRow {
  itw_duration_min: number;
  itw_buffer_min: number;
  default_itw_quota: number;
  photo_quota_per_stage: number;
  age_bonus_per_hour: string;
  age_bonus_cap: string;
  photo_rule: string | null;
  onsite_contract: boolean;
  photo_terms: string | null;
}
const mapConfig = (r: ConfigRow): EventConfig => ({
  itwDurationMin: r.itw_duration_min,
  itwBufferMin: r.itw_buffer_min,
  defaultItwQuota: r.default_itw_quota,
  photoQuotaPerStage: r.photo_quota_per_stage,
  ageBonusPerHour: Number(r.age_bonus_per_hour),
  ageBonusCap: Number(r.age_bonus_cap),
  photoRule: r.photo_rule ?? null,
  onsiteContract: r.onsite_contract,
  photoTerms: r.photo_terms ?? null,
});

const CONFIG_COLS = `itw_duration_min, itw_buffer_min, default_itw_quota, photo_quota_per_stage,
  age_bonus_per_hour, age_bonus_cap, photo_rule, onsite_contract, photo_terms`;

export async function insertEvent(
  input: {
    organizationId: string;
    ownerUserId: string;
    name: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    languages: Lang[];
  },
  db: Queryable = pool,
): Promise<Event> {
  const { rows } = await db.query<EventRow>(
    `INSERT INTO events (organization_id, owner_user_id, name, location, start_date, end_date, languages)
     VALUES ($1, $2, $3, $4, $5, $6, $7::lang_code[])
     RETURNING id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at`,
    [
      input.organizationId,
      input.ownerUserId,
      input.name,
      input.location ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.languages,
    ],
  );
  return mapEvent(rows[0]!);
}

export async function findEventById(id: string, db: Queryable = pool): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `SELECT id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at
     FROM events WHERE id = $1`,
    [id],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

/** Événement servi par un domaine personnalisé (résolution par Host). */
export async function findEventByCustomDomain(
  domain: string,
  db: Queryable = pool,
): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `SELECT id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at
     FROM events WHERE custom_domain = $1`,
    [domain],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

/** Affecte (ou retire avec `null`) le domaine personnalisé d'un événement ; remet `verified` à false. */
export async function setEventCustomDomain(
  eventId: string,
  domain: string | null,
  db: Queryable = pool,
): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `UPDATE events SET custom_domain = $2, custom_domain_verified = false
     WHERE id = $1
     RETURNING id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at`,
    [eventId, domain],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

export async function setCustomDomainVerified(
  eventId: string,
  verified: boolean,
  db: Queryable = pool,
): Promise<void> {
  await db.query('UPDATE events SET custom_domain_verified = $2 WHERE id = $1', [eventId, verified]);
}

/** Événement servi par un sous-domaine plateforme (slug.<PLATFORM_BASE_DOMAIN>). */
export async function findEventBySubdomain(
  slug: string,
  db: Queryable = pool,
): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `SELECT id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at
     FROM events WHERE subdomain_slug = $1`,
    [slug],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

/** Affecte (ou retire avec `null`) le slug de sous-domaine plateforme d'un événement. */
export async function setEventSubdomain(
  eventId: string,
  slug: string | null,
  db: Queryable = pool,
): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `UPDATE events SET subdomain_slug = $2 WHERE id = $1
     RETURNING id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at`,
    [eventId, slug],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

/**
 * Suppression définitive d'un événement. Toutes les données liées (journalistes,
 * demandes, lineup, communications, médias, membres…) tombent en cascade via les
 * contraintes ON DELETE CASCADE sur event_id.
 */
export async function deleteEvent(id: string, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM events WHERE id = $1', [id]);
  return rowCount ?? 0;
}

export async function listEventsByOwner(ownerUserId: string, db: Queryable = pool): Promise<Event[]> {
  const { rows } = await db.query<EventRow>(
    `SELECT id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at
     FROM events WHERE owner_user_id = $1 ORDER BY created_at DESC`,
    [ownerUserId],
  );
  return rows.map(mapEvent);
}

/** Tous les événements d'une organisation (admin de l'org). */
export async function listEventsForOrg(organizationId: string, db: Queryable = pool): Promise<Event[]> {
  const { rows } = await db.query<EventRow>(
    `SELECT id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at
     FROM events WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId],
  );
  return rows.map(mapEvent);
}

/** Événements auxquels l'utilisateur est explicitement assigné (membre). */
export async function listEventsForMember(userId: string, db: Queryable = pool): Promise<Event[]> {
  const { rows } = await db.query<EventRow>(
    `SELECT e.id, e.organization_id, e.owner_user_id, e.name, e.location, e.start_date, e.end_date, e.languages,
            e.accreditation_deadline, e.custom_domain, e.custom_domain_verified, e.subdomain_slug, e.created_at
     FROM events e
     JOIN event_members m ON m.event_id = e.id
     WHERE m.user_id = $1
     ORDER BY e.created_at DESC`,
    [userId],
  );
  return rows.map(mapEvent);
}

export async function isEventMember(
  eventId: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rows } = await db.query(
    'SELECT 1 FROM event_members WHERE event_id = $1 AND user_id = $2',
    [eventId, userId],
  );
  return rows.length > 0;
}

export async function addEventMember(
  eventId: string,
  userId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    'INSERT INTO event_members (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [eventId, userId],
  );
}

export async function removeEventMember(
  eventId: string,
  userId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('DELETE FROM event_members WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
}

/** Identifiants des membres d'un événement. */
export async function listEventMemberIds(eventId: string, db: Queryable = pool): Promise<string[]> {
  const { rows } = await db.query<{ user_id: string }>(
    'SELECT user_id FROM event_members WHERE event_id = $1',
    [eventId],
  );
  return rows.map((r) => r.user_id);
}

/** Identifiants des événements assignés à un utilisateur. */
export async function listEventIdsForUser(userId: string, db: Queryable = pool): Promise<string[]> {
  const { rows } = await db.query<{ event_id: string }>(
    'SELECT event_id FROM event_members WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => r.event_id);
}

export async function removeAllMembershipsForUser(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM event_members WHERE user_id = $1', [userId]);
}

/** Réattribue la propriété des événements d'un utilisateur (avant suppression de son compte). */
export async function reassignOwnedEvents(
  fromUserId: string,
  toUserId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('UPDATE events SET owner_user_id = $2 WHERE owner_user_id = $1', [fromUserId, toUserId]);
}

/** Met à jour la date de clôture des inscriptions (NULL = pas de limite). */
export async function setAccreditationDeadline(
  eventId: string,
  deadline: string | null,
  db: Queryable = pool,
): Promise<Event | null> {
  const { rows } = await db.query<EventRow>(
    `UPDATE events SET accreditation_deadline = $2 WHERE id = $1
     RETURNING id, organization_id, owner_user_id, name, location, start_date, end_date, languages, accreditation_deadline, custom_domain, custom_domain_verified, subdomain_slug, created_at`,
    [eventId, deadline],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

// ── Récapitulatif périodique des inscriptions ───────────────────────
interface RecapRow {
  frequency: RecapFrequency;
  recipients: string[] | string;
  last_sent_at: string | null;
}
const mapRecap = (r: RecapRow | undefined): EventRecap => ({
  frequency: r?.frequency ?? 'none',
  recipients: r ? parseTextArray(r.recipients) : [],
  lastSentAt: r?.last_sent_at ?? null,
});

// node-pg parse text[] nativement, mais on reste défensif (littéral "{a,b}").
function parseTextArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value;
  return value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((s) => s.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

export async function getRecap(eventId: string, db: Queryable = pool): Promise<EventRecap> {
  const { rows } = await db.query<RecapRow>(
    `SELECT frequency, recipients, last_sent_at FROM event_recap WHERE event_id = $1`,
    [eventId],
  );
  return mapRecap(rows[0]);
}

export async function upsertRecap(
  eventId: string,
  input: { frequency: RecapFrequency; recipients: string[] },
  db: Queryable = pool,
): Promise<EventRecap> {
  const { rows } = await db.query<RecapRow>(
    `INSERT INTO event_recap (event_id, frequency, recipients)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id) DO UPDATE
       SET frequency = EXCLUDED.frequency, recipients = EXCLUDED.recipients
     RETURNING frequency, recipients, last_sent_at`,
    [eventId, input.frequency, input.recipients],
  );
  return mapRecap(rows[0]);
}

export async function touchRecapSent(eventId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE event_recap SET last_sent_at = now() WHERE event_id = $1', [eventId]);
}


/** IDs des événements configurés avec une fréquence de récap donnée. */
export async function listEventIdsByRecapFrequency(
  frequency: RecapFrequency,
  db: Queryable = pool,
): Promise<string[]> {
  const { rows } = await db.query<{ event_id: string }>(
    `SELECT event_id FROM event_recap WHERE frequency = $1 AND array_length(recipients, 1) > 0`,
    [frequency],
  );
  return rows.map((r) => r.event_id);
}

// ── Config 1:1 ──────────────────────────────────────────────────────
export async function insertConfig(
  eventId: string,
  cfg: EventConfig,
  db: Queryable = pool,
): Promise<EventConfig> {
  const { rows } = await db.query<ConfigRow>(
    `INSERT INTO event_configs
       (event_id, itw_duration_min, itw_buffer_min, default_itw_quota,
        photo_quota_per_stage, age_bonus_per_hour, age_bonus_cap, photo_rule, onsite_contract, photo_terms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${CONFIG_COLS}`,
    [
      eventId,
      cfg.itwDurationMin,
      cfg.itwBufferMin,
      cfg.defaultItwQuota,
      cfg.photoQuotaPerStage,
      cfg.ageBonusPerHour,
      cfg.ageBonusCap,
      cfg.photoRule ?? null,
      cfg.onsiteContract,
      cfg.photoTerms ?? null,
    ],
  );
  return mapConfig(rows[0]!);
}

export async function getConfig(eventId: string, db: Queryable = pool): Promise<EventConfig | null> {
  const { rows } = await db.query<ConfigRow>(
    `SELECT ${CONFIG_COLS} FROM event_configs WHERE event_id = $1`,
    [eventId],
  );
  return rows[0] ? mapConfig(rows[0]) : null;
}

export async function updateConfig(
  eventId: string,
  cfg: EventConfig,
  db: Queryable = pool,
): Promise<EventConfig | null> {
  const { rows } = await db.query<ConfigRow>(
    `UPDATE event_configs SET
       itw_duration_min = $2, itw_buffer_min = $3, default_itw_quota = $4,
       photo_quota_per_stage = $5, age_bonus_per_hour = $6, age_bonus_cap = $7,
       photo_rule = $8, onsite_contract = $9, photo_terms = $10
     WHERE event_id = $1
     RETURNING ${CONFIG_COLS}`,
    [
      eventId,
      cfg.itwDurationMin,
      cfg.itwBufferMin,
      cfg.defaultItwQuota,
      cfg.photoQuotaPerStage,
      cfg.ageBonusPerHour,
      cfg.ageBonusCap,
      cfg.photoRule ?? null,
      cfg.onsiteContract,
      cfg.photoTerms ?? null,
    ],
  );
  return rows[0] ? mapConfig(rows[0]) : null;
}

/** Mise à jour PARTIELLE des règles photo (sans toucher aux quotas/durées). */
export async function updatePhotoRules(
  eventId: string,
  input: { photoRule: string | null; onsiteContract: boolean; photoTerms: string | null },
  db: Queryable = pool,
): Promise<EventConfig | null> {
  const { rows } = await db.query<ConfigRow>(
    `UPDATE event_configs SET photo_rule = $2, onsite_contract = $3, photo_terms = $4
     WHERE event_id = $1 RETURNING ${CONFIG_COLS}`,
    [eventId, input.photoRule, input.onsiteContract, input.photoTerms],
  );
  return rows[0] ? mapConfig(rows[0]) : null;
}

// ── Branding (personnalisation des pages publiques) ─────────────────
interface BrandingRow {
  logo_url: string | null;
  accent_color: string | null;
  bg_color: string | null;
  text_color: string | null;
  bg_image_url: string | null;
}
const mapBranding = (r: BrandingRow | undefined): EventBranding => ({
  logoUrl: r?.logo_url ?? null,
  accentColor: r?.accent_color ?? null,
  bgColor: r?.bg_color ?? null,
  textColor: r?.text_color ?? null,
  bgImageUrl: r?.bg_image_url ?? null,
});

const BRANDING_COLS = 'logo_url, accent_color, bg_color, text_color, bg_image_url';

export async function getBranding(eventId: string, db: Queryable = pool): Promise<EventBranding> {
  const { rows } = await db.query<BrandingRow>(
    `SELECT ${BRANDING_COLS} FROM event_branding WHERE event_id = $1`,
    [eventId],
  );
  return mapBranding(rows[0]);
}

export async function upsertBranding(
  eventId: string,
  branding: EventBranding,
  db: Queryable = pool,
): Promise<EventBranding> {
  const { rows } = await db.query<BrandingRow>(
    `INSERT INTO event_branding (event_id, logo_url, accent_color, bg_color, text_color, bg_image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id) DO UPDATE
       SET logo_url = EXCLUDED.logo_url,
           accent_color = EXCLUDED.accent_color,
           bg_color = EXCLUDED.bg_color,
           text_color = EXCLUDED.text_color,
           bg_image_url = EXCLUDED.bg_image_url
     RETURNING ${BRANDING_COLS}`,
    [
      eventId,
      branding.logoUrl,
      branding.accentColor,
      branding.bgColor,
      branding.textColor,
      branding.bgImageUrl,
    ],
  );
  return mapBranding(rows[0]);
}

// ── Types de média (poids) ──────────────────────────────────────────
interface MediaTypeRow {
  id: string;
  event_id: string;
  label: string;
  weight: number;
}
const mapMediaType = (r: MediaTypeRow): MediaType => ({
  id: r.id,
  eventId: r.event_id,
  label: r.label,
  weight: r.weight,
});

export async function insertMediaType(
  input: { eventId: string; label: string; weight: number },
  db: Queryable = pool,
): Promise<MediaType> {
  const { rows } = await db.query<MediaTypeRow>(
    `INSERT INTO media_types (event_id, label, weight) VALUES ($1, $2, $3)
     RETURNING id, event_id, label, weight`,
    [input.eventId, input.label, input.weight],
  );
  return mapMediaType(rows[0]!);
}

export async function listMediaTypes(eventId: string, db: Queryable = pool): Promise<MediaType[]> {
  const { rows } = await db.query<MediaTypeRow>(
    `SELECT id, event_id, label, weight FROM media_types WHERE event_id = $1 ORDER BY weight DESC, label`,
    [eventId],
  );
  return rows.map(mapMediaType);
}

export async function findMediaType(
  id: string,
  eventId: string,
  db: Queryable = pool,
): Promise<MediaType | null> {
  const { rows } = await db.query<MediaTypeRow>(
    `SELECT id, event_id, label, weight FROM media_types WHERE id = $1 AND event_id = $2`,
    [id, eventId],
  );
  return rows[0] ? mapMediaType(rows[0]) : null;
}

// ── Multiplicateurs par type de demande ─────────────────────────────
interface TypeWeightRow {
  type: RequestType;
  multiplier: string;
}
export async function upsertRequestTypeWeight(
  eventId: string,
  type: RequestType,
  multiplier: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO request_type_weights (event_id, type, multiplier)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, type) DO UPDATE SET multiplier = EXCLUDED.multiplier`,
    [eventId, type, multiplier],
  );
}

export async function listRequestTypeWeights(
  eventId: string,
  db: Queryable = pool,
): Promise<RequestTypeWeight[]> {
  const { rows } = await db.query<TypeWeightRow>(
    `SELECT type, multiplier FROM request_type_weights WHERE event_id = $1`,
    [eventId],
  );
  return rows.map((r) => ({ type: r.type, multiplier: Number(r.multiplier) }));
}

// ── Templates email/SMS ─────────────────────────────────────────────
interface TemplateRow {
  id: string;
  event_id: string;
  lang: Lang;
  trigger_key: string;
  channel: 'email' | 'sms';
  subject: string | null;
  body: string;
}
const mapTemplate = (r: TemplateRow): EmailTemplate => ({
  id: r.id,
  eventId: r.event_id,
  lang: r.lang,
  triggerKey: r.trigger_key,
  channel: r.channel,
  subject: r.subject,
  body: r.body,
});

export async function upsertTemplate(
  input: {
    eventId: string;
    lang: Lang;
    triggerKey: string;
    channel: 'email' | 'sms';
    subject?: string | null;
    body: string;
  },
  db: Queryable = pool,
): Promise<EmailTemplate> {
  const { rows } = await db.query<TemplateRow>(
    `INSERT INTO email_templates (event_id, lang, trigger_key, channel, subject, body)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id, lang, trigger_key, channel)
       DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body
     RETURNING id, event_id, lang, trigger_key, channel, subject, body`,
    [input.eventId, input.lang, input.triggerKey, input.channel, input.subject ?? null, input.body],
  );
  return mapTemplate(rows[0]!);
}

export async function listTemplates(eventId: string, db: Queryable = pool): Promise<EmailTemplate[]> {
  const { rows } = await db.query<TemplateRow>(
    `SELECT id, event_id, lang, trigger_key, channel, subject, body
     FROM email_templates WHERE event_id = $1 ORDER BY trigger_key, lang, channel`,
    [eventId],
  );
  return rows.map(mapTemplate);
}

export async function findTemplate(
  input: { eventId: string; lang: Lang; triggerKey: string; channel: 'email' | 'sms' },
  db: Queryable = pool,
): Promise<EmailTemplate | null> {
  const { rows } = await db.query<TemplateRow>(
    `SELECT id, event_id, lang, trigger_key, channel, subject, body
     FROM email_templates
     WHERE event_id = $1 AND lang = $2 AND trigger_key = $3 AND channel = $4`,
    [input.eventId, input.lang, input.triggerKey, input.channel],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}
