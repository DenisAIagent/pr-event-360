import { z } from 'zod';
import { AppError } from '../http/AppError';

/**
 * Politique de mot de passe unifiée (back-office + espace journaliste).
 * - minimum 12 caractères (ANSSI / bonnes pratiques 2024+) ;
 * - maximum 128 (borne le coût Argon2 sur entrées abusives) ;
 * - pas de complexité imposée : la longueur prime, et Argon2 absorbe l'entropie.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const DEFAULT_MSG = `Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum`;

/** Schéma Zod réutilisable dans les routes (corps de requête). */
export function passwordSchema(message: string = DEFAULT_MSG) {
  return z
    .string()
    .min(MIN_PASSWORD_LENGTH, message)
    .max(MAX_PASSWORD_LENGTH, `Mot de passe : ${MAX_PASSWORD_LENGTH} caractères maximum`);
}

/** Contrôle impératif pour les services (hors validation de route). */
export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(
      `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw AppError.badRequest(
      `Le mot de passe ne doit pas dépasser ${MAX_PASSWORD_LENGTH} caractères`,
    );
  }
}
