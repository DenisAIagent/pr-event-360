import { generateJournalistToken, hashJournalistToken } from '../lib/token';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { pool } from '../db/pool';
import {
  deleteProductionContact,
  findProductionContact,
  findProductionContactByTokenHash,
  insertProductionContact,
  listProductionContacts,
  rotateProductionToken,
  setContactArtists,
  updateProductionContact,
  type ProductionContact,
} from '../db/repositories/productionRepo';
import { listArtists } from '../db/repositories/lineupRepo';
import { getBranding, findEventById } from '../db/repositories/eventRepo';
import { ctaButton, escapeHtml, sendBrandedEmail } from './notifications/email';

const env = loadEnv();

/**
 * Durée de validité du lien production : 30 jours, là où le lien journaliste
 * tient 7 jours. La préparation d'un événement s'étale sur des semaines et un
 * contact prod consulte son espace par à-coups ; un lien mort au bout d'une
 * semaine générerait surtout des demandes de renvoi.
 */
const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function newAccessToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = generateJournalistToken();
  return {
    rawToken,
    tokenHash: hashJournalistToken(rawToken),
    expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
  };
}

export async function getProductionContacts(eventId: string): Promise<ProductionContact[]> {
  return listProductionContacts(eventId);
}

/**
 * Garde-fou multi-tenant : un identifiant d'artiste d'un autre événement est un
 * uuid valide et passerait la validation Zod. On vérifie l'appartenance.
 */
async function assertArtistsInEvent(artistIds: string[], eventId: string): Promise<void> {
  if (artistIds.length === 0) return;
  const artists = await listArtists(eventId);
  const known = new Set(artists.map((a) => a.id));
  if (artistIds.some((id) => !known.has(id))) {
    throw AppError.badRequest('Un artiste sélectionné n’appartient pas à cet événement.');
  }
}

export async function createProductionContact(input: {
  eventId: string;
  name: string;
  email: string;
  artistIds: string[];
}): Promise<ProductionContact> {
  await assertArtistsInEvent(input.artistIds, input.eventId);
  const id = await insertProductionContact({
    eventId: input.eventId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
  });
  await setContactArtists(id, input.artistIds);
  const contact = await findProductionContact(id, input.eventId);
  if (!contact) throw AppError.notFound('Contact introuvable');
  return contact;
}

export async function editProductionContact(input: {
  contactId: string;
  eventId: string;
  name: string;
  email: string;
  artistIds: string[];
}): Promise<ProductionContact> {
  const existing = await findProductionContact(input.contactId, input.eventId);
  if (!existing) throw AppError.notFound('Contact introuvable');
  await assertArtistsInEvent(input.artistIds, input.eventId);
  await updateProductionContact(input.contactId, input.eventId, {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
  });
  await setContactArtists(input.contactId, input.artistIds);
  const contact = await findProductionContact(input.contactId, input.eventId);
  if (!contact) throw AppError.notFound('Contact introuvable');
  return contact;
}

export async function removeProductionContact(contactId: string, eventId: string): Promise<void> {
  const existing = await findProductionContact(contactId, eventId);
  if (!existing) throw AppError.notFound('Contact introuvable');
  await deleteProductionContact(contactId, eventId);
}

/**
 * Émet un lien d'accès et l'envoie. Chaque envoi fait tourner le jeton : le lien
 * précédent cesse aussitôt de fonctionner.
 *
 * Le renvoi en clair du jeton n'a lieu qu'en test, comme pour l'accréditation
 * journaliste, afin que la suite e2e puisse suivre le lien sans lire les emails.
 */
export async function sendProductionAccessLink(
  contactId: string,
  eventId: string,
): Promise<{ contact: ProductionContact; accessToken: string | null }> {
  const contact = await findProductionContact(contactId, eventId);
  if (!contact) throw AppError.notFound('Contact introuvable');
  if (contact.artistIds.length === 0) {
    throw AppError.badRequest('Rattachez au moins un artiste à ce contact avant d’envoyer le lien.');
  }

  const event = await findEventById(eventId);
  if (!event) throw AppError.notFound('Événement introuvable');
  const branding = await getBranding(eventId);

  const token = newAccessToken();
  await rotateProductionToken(contact.id, token.tokenHash, token.expiresAt);
  const link = `${env.CLIENT_URL}/prod/${token.rawToken}`;

  const artists = await listArtists(eventId);
  const covered = artists.filter((a) => contact.artistIds.includes(a.id)).map((a) => a.name);

  const innerHtml = `
    <p>Bonjour ${escapeHtml(contact.name)},</p>
    <p>
      L’équipe presse de <strong>${escapeHtml(event.name)}</strong> vous invite à donner votre avis sur les
      demandes d’interview et de reportage adressées à
      ${covered.length === 1 ? '' : 'vos artistes'}<strong>${escapeHtml(covered.join(', '))}</strong>.
    </p>
    <p>Vous pourrez, pour chaque demande, indiquer si elle vous semble favorable ou non et laisser un commentaire.
       L’attaché de presse garde la décision finale.</p>
    ${ctaButton(link, 'Voir les demandes')}
    <p style="font-size:13px;color:#666;">Ce lien vous est personnel et reste valable 30 jours.</p>
  `;

  await sendBrandedEmail({
    to: contact.email,
    subject: `Demandes d’interview à valider — ${event.name}`,
    innerHtml,
    branding,
    eventName: event.name,
  });

  const refreshed = await findProductionContact(contactId, eventId);
  return {
    contact: refreshed ?? contact,
    accessToken: env.NODE_ENV === 'test' ? token.rawToken : null,
  };
}

/** Résout le contact porteur d'un jeton d'accès brut, ou lève une erreur. */
export async function requireContactByAccessToken(rawToken: string): Promise<ProductionContact> {
  const contact = await findProductionContactByTokenHash(hashJournalistToken(rawToken), pool);
  if (!contact) throw AppError.unauthorized('Lien invalide ou expiré');
  return contact;
}

/** Fait tourner le jeton après échange contre une session (le lien du mail meurt). */
export async function rotateAfterExchange(contactId: string): Promise<void> {
  const token = newAccessToken();
  await rotateProductionToken(contactId, token.tokenHash, token.expiresAt);
}
