import type { NextFunction, Request, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

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

/**
 * Valide `req.params`. Sans ce garde-fou, un identifiant malformé traverse la
 * couche métier jusqu'à PostgreSQL, qui le rejette en 22P02 → 500 (cf. C-02).
 * Le gestionnaire central rattrape aussi le cas, mais valider en amont évite
 * d'ouvrir une connexion base pour une requête vouée à l'échec.
 */
export function validateParams<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    Object.assign(req.params, schema.parse(req.params) as z.infer<S>);
    next();
  };
}

/** Valide `req.query` (chaînes uniquement : utiliser `z.coerce` pour les nombres/booléens). */
export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.query = schema.parse(req.query) as z.infer<S>;
    next();
  };
}

/** Schéma UUID réutilisable pour les identifiants de ressources. */
export const uuidParam = z.string().uuid('Identifiant invalide');
