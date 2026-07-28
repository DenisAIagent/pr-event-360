import type { NextFunction, Request, Response } from 'express';
import { insertAuditEntry } from '../db/repositories/auditRepo';
import { routePattern } from './errorHandler';

/** Verbes porteurs d'un effet de bord : toujours tracés. */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Lectures massives de données personnelles, tracées au même titre qu'une mutation
 * (art. 30 : « catégories de destinataires »). Comparé au motif de route paramétré,
 * jamais à l'URL réelle.
 */
const AUDITED_READS = [/\/export$/, /\/accreditations$/, /\/requests$/, /\/journalists$/];

/** Routes de sondage de l'interface : les tracer noierait le journal sans rien apporter. */
const IGNORED_ROUTES = new Set(['/api/admin/auth/me', '/api/admin/notif-mode']);

function shouldAudit(method: string, route: string): boolean {
  if (IGNORED_ROUTES.has(route)) return false;
  if (MUTATING.has(method)) return true;
  return method === 'GET' && AUDITED_READS.some((re) => re.test(route));
}

/**
 * Réassocie les segments du motif de route (`/:eventId/...`) aux segments de l'URL
 * réellement appelée. On n'utilise PAS `req.params` : Express le restaure à sa valeur
 * initiale en fin de dispatch, or le journal est écrit sur l'événement `finish`.
 *
 * Seuls les identifiants de chemin sont conservés — jamais le corps de la requête
 * (mots de passe, secrets MFA, contenus de fiches) ni la query string (jetons).
 */
export function extractRouteParams(pattern: string, actualPath: string): Record<string, string> {
  const patternSegments = pattern.split('/');
  const actualSegments = actualPath.split('/');
  if (patternSegments.length !== actualSegments.length) return {};

  const out: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const seg = patternSegments[i];
    if (!seg?.startsWith(':')) continue;
    const name = seg.slice(1).replace(/[?+*(].*$/, '');
    let value: string;
    try {
      value = decodeURIComponent(actualSegments[i] ?? '');
    } catch {
      continue; // séquence d'échappement invalide : on n'invente rien
    }
    // Garde-fou : un segment qui ne ressemble pas à un identifiant n'est pas consigné.
    if (/^[0-9a-zA-Z_-]{1,64}$/.test(value)) out[name] = value;
  }
  return out;
}

/**
 * Journal d'audit des accès d'administration (RGPD art. 5.2 « responsabilité » et
 * art. 32) : qui, quand, quoi, depuis quelle IP, avec quel résultat.
 *
 * Écrit APRÈS la réponse : l'échec d'écriture du journal ne doit jamais faire échouer
 * l'action de l'utilisateur, et la latence d'insertion ne doit pas peser sur le temps
 * de réponse. Les échecs et refus (403/404) sont consignés aussi — ce sont eux qui
 * révèlent une tentative d'accès indu.
 *
 * À monter APRÈS `requireAuth` (il lui faut `req.user`) et avant les routeurs.
 */
export function auditAdmin(req: Request, res: Response, next: NextFunction): void {
  const originalPath = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';

  res.on('finish', () => {
    const user = req.user;
    if (!user) return; // requête non authentifiée : rien d'imputable

    const route = routePattern(req);
    if (!shouldAudit(req.method, route)) return;

    void insertAuditEntry({
      actorUserId: user.sub,
      actorEmail: user.email,
      actorRole: user.isPlatformAdmin ? `${user.role}+platform` : user.role,
      organizationId: user.organizationId ?? null,
      method: req.method,
      route,
      resourceParams: extractRouteParams(route, originalPath),
      statusCode: res.statusCode,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
    }).catch((err: unknown) => {
      console.error('[audit] écriture du journal impossible', err);
    });
  });

  next();
}
