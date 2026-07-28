import { generateJournalistToken, hashJournalistToken } from '../lib/token';
import { rotateJournalistAccessToken } from '../db/repositories/journalistRepo';

const ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function newJournalistAccessToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = generateJournalistToken();
  return {
    rawToken,
    tokenHash: hashJournalistToken(rawToken),
    expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
  };
}

/** Émet un nouveau bearer et invalide immédiatement le précédent. */
export async function issueJournalistAccessToken(journalistId: string): Promise<string> {
  const token = newJournalistAccessToken();
  await rotateJournalistAccessToken(journalistId, token.tokenHash, token.expiresAt);
  return token.rawToken;
}
