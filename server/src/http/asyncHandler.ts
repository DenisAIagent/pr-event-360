import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Enrobe un handler async pour que toute promesse rejetée soit transmise au
 * gestionnaire d'erreurs central (Express 4 ne capte pas les rejets async seul).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
