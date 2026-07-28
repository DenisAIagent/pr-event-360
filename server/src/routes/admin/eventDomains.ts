import { Router } from 'express';
import { z } from 'zod';
import { resolve as dnsResolve, resolveCname } from 'node:dns/promises';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { AppError } from '../../http/AppError';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireEventEditor, requirePlatformAdmin } from '../../middleware/auth';
import { getAccessibleEventOrThrow } from '../../services/eventService';
import {
  findEventByCustomDomain,
  setEventCustomDomain,
  setCustomDomainVerified,
  findEventBySubdomain,
  setEventSubdomain,
} from '../../db/repositories/eventRepo';
import {
  customDomainTarget,
  platformBaseDomain,
  invalidateDomain,
  isReservedCustomDomain,
  normalizeDomain,
} from '../../services/siteService';

/**
 * Routeur « domaines » : sous-domaine plateforme self-service et domaine
 * personnalisé white-label (vérification DNS incluse). Monté sur
 * /api/admin/events aux côtés du routeur cœur.
 */
export const eventDomainsRouter = Router();
eventDomainsRouter.use(requireAuth);

// ── Sous-domaine plateforme (self-service) ──────────────────────────
const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'mail', 'static', 'assets', 'cdn']);
const SubdomainSchema = z.object({ slug: z.string().trim().max(63).nullable() });
eventDomainsRouter.put(
  '/:eventId/subdomain',
  requireEventEditor,
  validateBody(SubdomainSchema),
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const raw = (req.body as z.infer<typeof SubdomainSchema>).slug;
    const slug = raw ? raw.trim().toLowerCase() : null;
    if (slug) {
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
        throw AppError.badRequest('Identifiant invalide (lettres, chiffres, tirets ; ex. rock-in-rio)');
      }
      if (RESERVED_SLUGS.has(slug)) throw AppError.badRequest('Cet identifiant est réservé');
      const other = await findEventBySubdomain(slug);
      if (other && other.id !== event.id) {
        throw AppError.conflict('Cet identifiant est déjà pris par un autre événement');
      }
    }
    const updated = await setEventSubdomain(event.id, slug);
    invalidateDomain(event.subdomainSlug && base() ? `${event.subdomainSlug}.${base()}` : null);
    invalidateDomain(slug && base() ? `${slug}.${base()}` : null);
    sendData(res, { ...updated, platformBaseDomain: platformBaseDomain() });
  }),
);

function base(): string | null {
  return platformBaseDomain();
}

// ── Domaine personnalisé (white-label) ──────────────────────────────
const DomainSchema = z.object({ domain: z.string().trim().max(253).nullable() });
eventDomainsRouter.put(
  '/:eventId/domain',
  requirePlatformAdmin,
  validateBody(DomainSchema),
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const raw = (req.body as z.infer<typeof DomainSchema>).domain;
    const domain = raw ? normalizeDomain(raw) : null;
    if (domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
      throw AppError.badRequest('Domaine invalide (ex. presse.mon-evenement.com)');
    }
    if (domain) {
      if (isReservedCustomDomain(domain)) {
        throw AppError.badRequest('Ce domaine est réservé à la plateforme');
      }
      const other = await findEventByCustomDomain(domain);
      if (other && other.id !== event.id) {
        throw AppError.conflict('Ce domaine est déjà utilisé par un autre événement');
      }
    }
    const updated = await setEventCustomDomain(event.id, domain);
    invalidateDomain(event.customDomain); // ancien
    invalidateDomain(domain); // nouveau
    sendData(res, { ...updated, customDomainTarget: customDomainTarget() });
  }),
);

eventDomainsRouter.post(
  '/:eventId/domain/verify',
  requirePlatformAdmin,
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    if (!event.customDomain) throw AppError.badRequest('Aucun domaine personnalisé défini');
    const target = normalizeDomain(customDomainTarget());
    let verified = false;
    try {
      const cnames = await resolveCname(event.customDomain);
      verified = cnames.some((c) => normalizeDomain(c) === target);
    } catch {
      // Pas d'enregistrement CNAME : on tente une comparaison d'adresses (A/AAAA).
      try {
        const [domainIps, targetIps] = await Promise.all([
          dnsResolve(event.customDomain).catch(() => [] as string[]),
          dnsResolve(target).catch(() => [] as string[]),
        ]);
        verified = domainIps.length > 0 && domainIps.some((ip) => targetIps.includes(ip));
      } catch {
        verified = false;
      }
    }
    await setCustomDomainVerified(event.id, verified);
    invalidateDomain(event.customDomain);
    sendData(res, { verified, target });
  }),
);
