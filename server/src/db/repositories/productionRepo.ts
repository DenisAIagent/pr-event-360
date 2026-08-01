import { pool } from '../pool';
import type { Queryable } from '../types';

/** Contact production : identité externe porteuse d'un jeton d'accès. */
export interface ProductionContact {
  id: string;
  eventId: string;
  name: string;
  email: string;
  tokenExpiresAt: Date | null;
  lastSentAt: Date | null;
  createdAt: Date;
  /** Artistes couverts par le lien de ce contact. */
  artistIds: string[];
}

interface ContactRow {
  id: string;
  event_id: string;
  name: string;
  email: string;
  token_expires_at: Date | null;
  last_sent_at: Date | null;
  created_at: Date;
  artist_ids: string[] | null;
}

const mapContact = (r: ContactRow): ProductionContact => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  email: r.email,
  tokenExpiresAt: r.token_expires_at,
  lastSentAt: r.last_sent_at,
  createdAt: r.created_at,
  artistIds: r.artist_ids ?? [],
});

/** `token_hash` n'est jamais sélectionné : il ne doit pas circuler hors de la vérification. */
const SELECT_CONTACT = `
  SELECT c.id, c.event_id, c.name, c.email, c.token_expires_at, c.last_sent_at, c.created_at,
         COALESCE(
           (SELECT array_agg(a.artist_id) FROM production_contact_artists a WHERE a.contact_id = c.id),
           '{}'
         ) AS artist_ids
  FROM production_contacts c
`;

export async function listProductionContacts(eventId: string, db: Queryable = pool): Promise<ProductionContact[]> {
  const { rows } = await db.query<ContactRow>(
    `${SELECT_CONTACT} WHERE c.event_id = $1 ORDER BY c.created_at DESC`,
    [eventId],
  );
  return rows.map(mapContact);
}

export async function findProductionContact(
  id: string,
  eventId: string,
  db: Queryable = pool,
): Promise<ProductionContact | null> {
  const { rows } = await db.query<ContactRow>(`${SELECT_CONTACT} WHERE c.id = $1 AND c.event_id = $2`, [id, eventId]);
  return rows[0] ? mapContact(rows[0]) : null;
}

/**
 * Résout un contact depuis un jeton d'accès haché non expiré. Même forme que
 * `findJournalistByToken` : la comparaison porte sur l'empreinte, jamais sur le
 * jeton en clair, et l'expiration est filtrée en SQL.
 */
export async function findProductionContactByTokenHash(
  tokenHash: string,
  db: Queryable = pool,
): Promise<ProductionContact | null> {
  const { rows } = await db.query<ContactRow>(
    `${SELECT_CONTACT} WHERE c.token_hash = $1 AND c.token_expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? mapContact(rows[0]) : null;
}

export async function insertProductionContact(
  input: { eventId: string; name: string; email: string },
  db: Queryable = pool,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO production_contacts (event_id, name, email) VALUES ($1, $2, $3) RETURNING id`,
    [input.eventId, input.name, input.email],
  );
  return rows[0]!.id;
}

export async function updateProductionContact(
  id: string,
  eventId: string,
  input: { name: string; email: string },
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE production_contacts SET name = $3, email = $4 WHERE id = $1 AND event_id = $2`, [
    id,
    eventId,
    input.name,
    input.email,
  ]);
}

export async function deleteProductionContact(id: string, eventId: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM production_contacts WHERE id = $1 AND event_id = $2', [id, eventId]);
}

/** Remplace le périmètre du contact. Les artistes sont revalidés côté service. */
export async function setContactArtists(contactId: string, artistIds: string[], db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM production_contact_artists WHERE contact_id = $1', [contactId]);
  if (artistIds.length === 0) return;
  await db.query(
    `INSERT INTO production_contact_artists (contact_id, artist_id)
     SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING`,
    [contactId, artistIds],
  );
}

/** Pose un nouveau jeton et invalide immédiatement le précédent. */
export async function rotateProductionToken(
  id: string,
  tokenHash: string,
  expiresAt: Date,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE production_contacts SET token_hash = $2, token_expires_at = $3, last_sent_at = now() WHERE id = $1`,
    [id, tokenHash, expiresAt],
  );
}

// ── Avis ────────────────────────────────────────────────────────────

export type ReviewVerdict = 'favorable' | 'defavorable';

export interface RequestReview {
  requestId: string;
  verdict: ReviewVerdict;
  comment: string | null;
  contactName: string | null;
  at: Date;
}

interface ReviewRow {
  request_id: string;
  verdict: ReviewVerdict;
  comment: string | null;
  contact_name: string | null;
  updated_at: Date;
}

const mapReview = (r: ReviewRow): RequestReview => ({
  requestId: r.request_id,
  verdict: r.verdict,
  comment: r.comment,
  contactName: r.contact_name,
  at: r.updated_at,
});

/**
 * Enregistre ou met à jour l'avis d'un contact sur une demande. Un contact ne
 * porte qu'un avis par demande (contrainte `request_reviews_once`) : ré-émettre
 * un avis corrige le précédent plutôt que d'empiler.
 */
export async function upsertRequestReview(
  input: {
    requestId: string;
    eventId: string;
    contactId: string;
    verdict: ReviewVerdict;
    comment: string | null;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO request_reviews (request_id, event_id, contact_id, verdict, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (request_id, contact_id)
     DO UPDATE SET verdict = EXCLUDED.verdict, comment = EXCLUDED.comment, updated_at = now()`,
    [input.requestId, input.eventId, input.contactId, input.verdict, input.comment],
  );
}

/** Avis les plus récents des demandes d'un événement, indexés par demande. */
export async function reviewsByEvent(eventId: string, db: Queryable = pool): Promise<Map<string, RequestReview>> {
  const { rows } = await db.query<ReviewRow>(
    `SELECT DISTINCT ON (r.request_id)
            r.request_id, r.verdict, r.comment, r.updated_at, c.name AS contact_name
     FROM request_reviews r
     LEFT JOIN production_contacts c ON c.id = r.contact_id
     WHERE r.event_id = $1
     ORDER BY r.request_id, r.updated_at DESC`,
    [eventId],
  );
  return new Map(rows.map((r) => [r.request_id, mapReview(r)]));
}

/** Avis portés sur une demande (fil de la demande côté back-office). */
export async function listRequestReviews(requestId: string, db: Queryable = pool): Promise<RequestReview[]> {
  const { rows } = await db.query<ReviewRow>(
    `SELECT r.request_id, r.verdict, r.comment, r.updated_at, c.name AS contact_name
     FROM request_reviews r
     LEFT JOIN production_contacts c ON c.id = r.contact_id
     WHERE r.request_id = $1
     ORDER BY r.updated_at DESC`,
    [requestId],
  );
  return rows.map(mapReview);
}

/** Avis déjà donnés par un contact, pour préremplir son espace. */
export async function reviewsByContact(contactId: string, db: Queryable = pool): Promise<Map<string, RequestReview>> {
  const { rows } = await db.query<ReviewRow>(
    `SELECT r.request_id, r.verdict, r.comment, r.updated_at, NULL::text AS contact_name
     FROM request_reviews r WHERE r.contact_id = $1`,
    [contactId],
  );
  return new Map(rows.map((r) => [r.request_id, mapReview(r)]));
}
