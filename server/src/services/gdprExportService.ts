import { AppError } from '../http/AppError';
import { findJournalistById } from '../db/repositories/journalistRepo';
import { listRequestsByJournalist } from '../db/repositories/requestRepo';
import { listCoverageByJournalist } from '../db/repositories/coverageRepo';
import { listPressConferencesForJournalist } from './pressConferenceService';
import type { Journalist } from '../domain';

/**
 * Export structuré art. 15 (accès) / art. 20 (portabilité) pour un journaliste.
 * Ne contient jamais de hash de mot de passe ni de jeton d'accès.
 */
export async function exportJournalistPersonalData(
  eventId: string,
  journalistId: string,
): Promise<Record<string, unknown>> {
  const journalist = await findJournalistById(journalistId);
  if (!journalist || journalist.eventId !== eventId) {
    throw AppError.notFound('Journaliste introuvable pour cet événement');
  }
  return buildExport(journalist);
}

/** Auto-export depuis l'espace journaliste (même contenu, authentifié par token/session). */
export async function exportOwnJournalistPersonalData(
  journalist: Journalist,
): Promise<Record<string, unknown>> {
  return buildExport(journalist);
}

async function buildExport(journalist: Journalist): Promise<Record<string, unknown>> {
  const [requests, coverage, pressConferences] = await Promise.all([
    listRequestsByJournalist(journalist.id),
    listCoverageByJournalist(journalist.id),
    listPressConferencesForJournalist(journalist),
  ]);

  const { passwordHash: _passwordHash, ...safeJournalist } = journalist;

  return {
    format: 'PR-Event-360-GDPR-export-v1',
    exportedAt: new Date().toISOString(),
    rights: ['access', 'portability'],
    articles: ['15', '20'],
    journalist: {
      ...safeJournalist,
      hasPassword: Boolean(journalist.passwordHash),
    },
    requests: requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      message: r.message,
      artistId: r.artistId,
      slotId: r.slotId,
      stageId: r.stageId,
      createdAt: r.createdAt,
    })),
    coverage: coverage.map((c) => ({
      id: c.id,
      mediaCategory: c.mediaCategory,
      isUpload: c.isUpload,
      url: c.url,
      title: c.title,
      archiveConsent: c.archiveConsent,
      promoConsent: c.promoConsent,
      createdAt: c.createdAt,
    })),
    pressConferences: pressConferences.map((pc) => ({
      id: pc.id,
      title: pc.title,
      startsAt: pc.startsAt,
      venue: pc.venue,
      registrationStatus: pc.registrationStatus,
    })),
  };
}
