/**
 * Erreur applicative avec code HTTP. Le gestionnaire d'erreurs central la
 * traduit en réponse JSON propre (message utile, pas de fuite de détail interne).
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, message, details);
  }
  static unauthorized(message = 'Authentification requise'): AppError {
    return new AppError(401, message);
  }
  static forbidden(message = 'Accès refusé'): AppError {
    return new AppError(403, message);
  }
  static notFound(message = 'Ressource introuvable'): AppError {
    return new AppError(404, message);
  }
  static conflict(message: string): AppError {
    return new AppError(409, message);
  }
}
