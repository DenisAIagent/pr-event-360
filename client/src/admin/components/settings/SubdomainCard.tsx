import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';

interface SiteInfo {
  subdomainSlug: string | null;
  platformBaseDomain: string | null;
}

/**
 * Sous-domaine self-service sur la plateforme (ex. rockinrio.<base>). Le client choisit
 * un identifiant ; aucun DNS/TLS de son côté (certificat wildcard). Si le domaine de base
 * n'est pas encore configuré (PLATFORM_BASE_DOMAIN), l'identifiant est mémorisé et s'activera après.
 */
export function SubdomainCard({ eventId }: { eventId: string }) {
  const api = useAuthedApi();
  const toast = useToast();
  const { data, reload } = useFetch<SiteInfo>(
    () => api.get<SiteInfo>(`/admin/events/${eventId}`),
    [eventId],
  );
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setSlug(data.subdomainSlug ?? '');
  }, [data]);

  const base = data?.platformBaseDomain ?? null;
  const saved = data?.subdomainSlug ?? null;
  const clean = slug.trim().toLowerCase();
  const changed = clean !== (saved ?? '');

  async function save() {
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/subdomain`, { slug: clean || null });
      toast.success(clean ? 'Sous-domaine enregistré.' : 'Sous-domaine retiré.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Sous-domaine</h3>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '4px 0 0' }}>
          Une adresse prête à l’emploi sur la plateforme — aucune configuration DNS de votre côté.
        </p>
      </div>

      <div className="field">
        <label htmlFor="subdomain-slug">Identifiant</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            id="subdomain-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="rock-in-rio"
            autoCapitalize="none"
            spellCheck={false}
            style={{ flex: 1 }}
          />
          {base && <span className="muted" style={{ whiteSpace: 'nowrap' }}>.{base}</span>}
        </div>
      </div>

      {clean && base && (
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Adresse&nbsp;: <code style={{ userSelect: 'all' }}>https://{clean}.{base}</code>
        </p>
      )}
      {!base && (
        <div className="banner" style={{ fontSize: 'var(--text-sm)' }}>
          Le domaine de base de la plateforme n’est pas encore configuré. L’identifiant est mémorisé et
          deviendra actif une fois le wildcard en place.
        </div>
      )}

      <div className="inline-actions">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !changed}>
          Enregistrer
        </button>
      </div>
    </section>
  );
}
