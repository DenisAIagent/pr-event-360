import argon2 from 'argon2';
import { AppError } from '../http/AppError';
import {
  findAcceptedJournalistByEmail,
  findJournalistByToken,
  setJournalistPassword,
} from '../db/repositories/journalistRepo';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Le journaliste (accès par lien magique) définit ou remplace son mot de passe d'espace.
 * Lui permet ensuite de se reconnecter par email + mot de passe, sans dépendre de l'email.
 */
export async function setSpacePassword(token: string, password: string): Promise<void> {
  const journalist = await findJournalistByToken(token);
  if (!journalist) throw AppError.notFound('Espace introuvable');
  if (journalist.accStatus !== 'acceptee') {
    throw AppError.forbidden('Accréditation non encore acceptée');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`);
  }
  const passwordHash = await argon2.hash(password);
  await setJournalistPassword(journalist.id, passwordHash);
}

/**
 * Login journaliste par email + mot de passe (compte par événement). En cas de succès,
 * renvoie le token d'espace existant : le client redirige alors vers /espace/:token.
 */
export async function journalistLogin(
  eventId: string,
  email: string,
  password: string,
): Promise<{ token: string; firstName: string }> {
  const journalist = await findAcceptedJournalistByEmail(eventId, email);
  // Message générique : on ne révèle pas si un compte existe.
  const invalid = AppError.unauthorized('Email ou mot de passe incorrect');
  if (!journalist || !journalist.passwordHash) {
    // Hachage factice anti-timing pour ne pas divulguer l'existence du compte.
    await argon2.hash(password).catch(() => undefined);
    throw invalid;
  }
  const ok = await argon2.verify(journalist.passwordHash, password);
  if (!ok || !journalist.token) throw invalid;
  return { token: journalist.token, firstName: journalist.firstName };
}
