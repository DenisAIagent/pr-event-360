import { useParams } from 'react-router-dom';

/**
 * Contexte « domaine personnalisé ». Quand l'app est servie sous le domaine d'un
 * événement, le serveur injecte `window.__PR_EVENT__` dans la page. Le routeur passe
 * alors en « mode domaine » : les surfaces publiques sont à la racine (sans `:eventId`).
 */
export interface DomainEvent {
  id: string;
  name: string;
}

/** Lit le bloc de données `<script type="application/json" id="__pr_event__">` injecté
 *  par le serveur sur les domaines personnalisés (CSP-safe, non exécuté). */
function readDomainEvent(): DomainEvent | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('__pr_event__');
  if (!el?.textContent) return null;
  try {
    const o = JSON.parse(el.textContent) as Partial<DomainEvent>;
    return o && typeof o.id === 'string' ? { id: o.id, name: o.name ?? '' } : null;
  } catch {
    return null;
  }
}

export const domainEvent: DomainEvent | null = readDomainEvent();

export const isDomainMode = domainEvent !== null;

/** ID de l'événement courant : paramètre d'URL, sinon contexte domaine. */
export function useEventId(): string {
  const { eventId } = useParams();
  return eventId ?? domainEvent?.id ?? '';
}

/** Chemin de la newsroom selon le mode (domaine : `/newsroom`, sinon `/newsroom/:eventId`). */
export function newsroomPath(eventId: string): string {
  return domainEvent ? '/newsroom' : `/newsroom/${eventId}`;
}

/** Chemin d'un communiqué selon le mode (domaine : `/newsroom/:slug`, sinon `/newsroom/:eventId/:slug`). */
export function pressReleasePath(eventId: string, slug: string): string {
  return domainEvent ? `/newsroom/${slug}` : `/newsroom/${eventId}/${slug}`;
}

export interface EventLinks {
  accreditation: string;
  newsroom: string;
  login: string;
  forgot: string;
  reset: string;
}

/**
 * Liens inter-surfaces selon le mode. En mode domaine, tout est à la racine
 * (`/`, `/newsroom`, `/connexion`…) ; sinon préfixé par l'événement.
 * `fallbackEventId` couvre les pages tokenisées (espace) qui n'ont pas l'ID en URL.
 */
export function useEventLinks(fallbackEventId?: string): EventLinks {
  const { eventId } = useParams();
  if (domainEvent) {
    return {
      accreditation: '/',
      newsroom: '/newsroom',
      login: '/connexion',
      forgot: '/mot-de-passe-oublie',
      reset: '/reinitialiser',
    };
  }
  const id = eventId ?? fallbackEventId ?? '';
  return {
    accreditation: `/accreditation/${id}`,
    newsroom: `/newsroom/${id}`,
    login: `/evenement/${id}/connexion`,
    forgot: `/evenement/${id}/mot-de-passe-oublie`,
    reset: `/evenement/${id}/reinitialiser`,
  };
}
