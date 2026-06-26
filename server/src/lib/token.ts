import { createHash, randomBytes } from 'node:crypto';

/**
 * Génère un token unique NON DEVINABLE pour l'espace journaliste.
 * 32 octets aléatoires (256 bits) encodés en base64url → ~43 caractères URL-safe.
 */
export function generateJournalistToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Génère un jeton de réinitialisation de mot de passe : 32 octets aléatoires
 * (256 bits) en base64url. C'est la valeur transmise dans le lien à l'utilisateur.
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash SHA-256 d'un jeton de réinitialisation. Seul le hash est stocké en base ;
 * le jeton ayant une entropie de 256 bits, un hash sans sel est non réversible.
 */
export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
