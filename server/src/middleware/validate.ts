import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Valide `req.body` contre un schéma zod et remplace le body par la valeur
 * typée/nettoyée. Lève une ZodError captée par le gestionnaire central.
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body) as z.infer<S>;
    next();
  };
}
