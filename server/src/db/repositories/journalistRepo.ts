import { pool } from '../pool';
import type { Queryable } from '../types';
import type { Journalist } from '../../domain';
import type { AccreditationStatus, AccreditationType, Lang } from '@pr-event-360/core';

interface JournalistRow {
  id: string;
  event_id: string;
  token: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  media: string | null;
  media_type_id: string | null;
  audience: string | null;
  prev_article: string | null;
  lang: Lang;
  accreditation_type: AccreditationType | null;
  acc_status: AccreditationStatus;
  commit_publish: boolean;
  consent: boolean;
  password_hash: string | null;
  created_at: string;
}

const map = (r: JournalistRow): Journalist => ({
  id: r.id,
  eventId: r.event_id,
  token: r.token,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone,
  media: r.media,
  mediaTypeId: r.media_type_id,
  audience: r.audience,
  prevArticle: r.prev_article,
  lang: r.lang,
  accreditationType: r.accreditation_type,
  accStatus: r.acc_status,
  commitPublish: r.commit_publish,
  consent: r.consent,
  passwordHash: r.password_hash,
  createdAt: r.created_at,
});

const COLS = `id, event_id, token, first_name, last_name, email, phone, media,
  media_type_id, audience, prev_article, lang, accreditation_type, acc_status,
  commit_publish, consent, password_hash, created_at`;

export interface CreateJournalistInput {
  eventId: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  media?: string | null;
  mediaTypeId?: string | null;
  audience?: string | null;
  prevArticle?: string | null;
  lang: Lang;
  accreditationType?: AccreditationType | null;
  commitPublish: boolean;
  consent: boolean;
}

export async function insertJournalist(
  input: CreateJournalistInput,
  db: Queryable = pool,
): Promise<Journalist> {
  const { rows } = await db.query<JournalistRow>(
    `INSERT INTO journalists
      (event_id, first_name, last_name, email, phone, media, media_type_id,
       audience, prev_article, lang, accreditation_type, commit_publish, consent, consent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, CASE WHEN $13 THEN now() ELSE NULL END)
     RETURNING ${COLS}`,
    [
      input.eventId,
      input.firstName,
      input.lastName ?? null,
      input.email,
      input.phone ?? null,
      input.media ?? null,
      input.mediaTypeId ?? null,
      input.audience ?? null,
      input.prevArticle ?? null,
      input.lang,
      input.accreditationType ?? null,
      input.commitPublish,
      input.consent,
    ],
  );
  return map(rows[0]!);
}

export async function findJournalistById(
  id: string,
  db: Queryable = pool,
): Promise<Journalist | null> {
  const { rows } = await db.query<JournalistRow>(`SELECT ${COLS} FROM journalists WHERE id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findJournalistByToken(
  token: string,
  db: Queryable = pool,
): Promise<Journalist | null> {
  const { rows } = await db.query<JournalistRow>(`SELECT ${COLS} FROM journalists WHERE token = $1`, [
    token,
  ]);
  return rows[0] ? map(rows[0]) : null;
}

/**
 * Journaliste ACCEPTÉ d'un événement par email, ayant défini un mot de passe.
 * Sert au login email + mot de passe (compte par événement). Insensible à la casse ;
 * en cas de doublons d'accréditation, on prend la plus récente.
 */
export async function findAcceptedJournalistByEmail(
  eventId: string,
  email: string,
  db: Queryable = pool,
): Promise<Journalist | null> {
  const { rows } = await db.query<JournalistRow>(
    `SELECT ${COLS} FROM journalists
     WHERE event_id = $1 AND lower(email) = lower($2)
       AND acc_status = 'acceptee' AND password_hash IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    [eventId, email],
  );
  return rows[0] ? map(rows[0]) : null;
}

/**
 * Journaliste ACCEPTÉ d'un événement par email (qu'il ait déjà un mot de passe ou non).
 * Sert à la réinitialisation : on peut redéfinir un mot de passe même si aucun n'existe.
 */
export async function findAcceptedJournalistByEmailForReset(
  eventId: string,
  email: string,
  db: Queryable = pool,
): Promise<Journalist | null> {
  const { rows } = await db.query<JournalistRow>(
    `SELECT ${COLS} FROM journalists
     WHERE event_id = $1 AND lower(email) = lower($2) AND acc_status = 'acceptee'
     ORDER BY created_at DESC LIMIT 1`,
    [eventId, email],
  );
  return rows[0] ? map(rows[0]) : null;
}

/** Définit (ou remplace) le hash de mot de passe d'espace d'un journaliste. */
export async function setJournalistPassword(
  id: string,
  passwordHash: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('UPDATE journalists SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
}

export interface JournalistSearchHit {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  media: string | null;
  eventId: string;
  eventName: string;
  accStatus: AccreditationStatus;
}

/**
 * Recherche de journalistes par nom / email / média, limitée à un ensemble
 * d'événements (ceux accessibles à l'utilisateur). Insensible à la casse.
 */
export async function searchJournalists(
  eventIds: string[],
  query: string,
  limit = 8,
  db: Queryable = pool,
): Promise<JournalistSearchHit[]> {
  if (eventIds.length === 0) return [];
  // Échappe les jokers ILIKE pour traiter la saisie comme du texte littéral.
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { rows } = await db.query<{
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    media: string | null;
    event_id: string;
    event_name: string;
    acc_status: AccreditationStatus;
  }>(
    `SELECT j.id, j.first_name, j.last_name, j.email, j.media,
            j.event_id, e.name AS event_name, j.acc_status
     FROM journalists j
     JOIN events e ON e.id = j.event_id
     WHERE j.event_id = ANY($1::uuid[])
       AND (j.first_name ILIKE $2 OR j.last_name ILIKE $2 OR j.email ILIKE $2 OR j.media ILIKE $2)
     ORDER BY j.created_at DESC
     LIMIT $3`,
    [eventIds, like, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    media: r.media,
    eventId: r.event_id,
    eventName: r.event_name,
    accStatus: r.acc_status,
  }));
}

export async function listJournalistsByEvent(
  eventId: string,
  db: Queryable = pool,
): Promise<Journalist[]> {
  const { rows } = await db.query<JournalistRow>(
    `SELECT ${COLS} FROM journalists WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId],
  );
  return rows.map(map);
}

/** Met à jour le statut d'accréditation et, à l'acceptation, pose le token. */
export async function updateAccreditation(
  id: string,
  accStatus: AccreditationStatus,
  token: string | null,
  db: Queryable = pool,
): Promise<Journalist | null> {
  const { rows } = await db.query<JournalistRow>(
    `UPDATE journalists SET acc_status = $2, token = COALESCE($3, token)
     WHERE id = $1 RETURNING ${COLS}`,
    [id, accStatus, token],
  );
  return rows[0] ? map(rows[0]) : null;
}

/** Journalistes inscrits depuis un instant donné (récapitulatif périodique). */
export async function listJournalistsCreatedSince(
  eventId: string,
  sinceIso: string,
  db: Queryable = pool,
): Promise<Journalist[]> {
  const { rows } = await db.query<JournalistRow>(
    `SELECT ${COLS} FROM journalists WHERE event_id = $1 AND created_at > $2 ORDER BY created_at ASC`,
    [eventId, sinceIso],
  );
  return rows.map(map);
}

export async function countJournalistsByEvent(eventId: string, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    'SELECT count(*)::int AS count FROM journalists WHERE event_id = $1',
    [eventId],
  );
  return Number(rows[0]!.count);
}

/**
 * Effacement RGPD (art. 17) d'un journaliste et de toutes ses données rattachées.
 * Les demandes et l'historique sont supprimés en cascade (FK ON DELETE CASCADE).
 * Scopé à l'événement par sécurité. Retourne le nombre de lignes supprimées (0 ou 1).
 */
export async function deleteJournalist(
  eventId: string,
  journalistId: string,
  db: Queryable = pool,
): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM journalists WHERE event_id = $1 AND id = $2', [
    eventId,
    journalistId,
  ]);
  return rowCount ?? 0;
}
