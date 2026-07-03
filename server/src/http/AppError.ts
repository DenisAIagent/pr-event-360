/**
 * Erreur applicative avec code HTTP et code d'erreur stable (`PRE-####`, cf.
 * errorCodes.ts). Le gestionnaire d'erreurs central la traduit en réponse JSON
 * propre (message utile, code identifiable, pas de fuite de détail interne).
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
    /** Code d'erreur stable exposé au client et journalisé (identification/traçage). */
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown, code?: string): AppError {
    return new AppError(400, message, details, code);
  }
  static unauthorized(message = 'Authentification requise', code?: string): AppError {
    return new AppError(401, message, undefined, code);
  }
  static forbidden(message = 'Accès refusé', code?: string): AppError {
    return new AppError(403, message, undefined, code);
  }
  static notFound(message = 'Ressource introuvable', code?: string): AppError {
    return new AppError(404, message, undefined, code);
  }
  static conflict(message: string, code?: string): AppError {
    return new AppError(409, message, undefined, code);
  }
}
