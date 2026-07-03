import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Identifiant court de requête : corrèle la notification côté client aux logs serveur. */
      id?: string;
    }
  }
}

/**
 * Assigne un identifiant de requête (`req_xxxxxxxx`) et le renvoie en en-tête
 * `X-Request-Id`. Cet identifiant accompagne chaque erreur (notification + logs)
 * pour retrouver un incident précis dans les journaux serveur.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = `req_${crypto.randomBytes(6).toString('hex')}`;
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
