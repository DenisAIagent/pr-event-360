import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';

interface DomainInfo {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainTarget: string;
}

/**
 * Domaine personnalisé (white-label) d'un événement. L'opérateur saisit le domaine,
 * le client crée un CNAME vers la cible affichée, puis « Vérifier » contrôle le DNS.
 * Le provisioning TLS se fait côté hébergeur (voir docs/custom-domains.md).
 */
export function DomainCard({ eventId }: { eventId: string }) {
  const api = useAuthedApi();
  const toast = useToast();
  const { data, reload } = useFetch<DomainInfo>(
    () => api.get<DomainInfo>(`/admin/events/${eventId}`),
    [eventId],
  );
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDomain(data.customDomain ?? '');
  }, [data]);

  async function save() {
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/domain`, { domain: domain.trim() || null });
      toast.success(domain.trim() ? 'Domaine enregistré.' : 'Domaine retiré.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      const r = await api.post<{ verified: boolean }>(`/admin/events/${eventId}/domain/verify`);
      if (r.verified) toast.success('Domaine vérifié ✓');
      else toast.error('DNS pas encore propagé ou incorrect. Réessayez plus tard.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }

  const target = data?.customDomainTarget ?? '';
  const saved = data?.customDomain ?? null;
  const changed = domain.trim() !== (saved ?? '');

  return (
    <section className="card stack">
      <div>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Domaine personnalisé</h3>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '4px 0 0' }}>
          Servez les pages publiques de cet événement sous le domaine du client (ex.{' '}
          <code>presse.mon-festival.com</code>).
        </p>
      </div>

      <div className="field">
        <label htmlFor="custom-domain">Domaine</label>
        <input
          id="custom-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="presse.mon-festival.com"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      <div className="inline-actions">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !changed}>
          Enregistrer
        </button>
        {saved && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={verify} disabled={busy || changed}>
              Vérifier le DNS
            </button>
            <span className={`badge ${data?.customDomainVerified ? 'badge-success' : 'badge-warn'}`}>
              {data?.customDomainVerified ? 'Vérifié' : 'En attente de vérification'}
            </span>
          </>
        )}
      </div>

      {saved && target && (
        <div className="banner" style={{ fontSize: 'var(--text-sm)' }}>
          Chez le registrar du client, créez un enregistrement <strong>CNAME</strong> du domaine{' '}
          <code>{saved}</code> vers&nbsp;:
          <br />
          <code style={{ userSelect: 'all' }}>{target}</code>
          <br />
          <span className="muted">
            Le certificat HTTPS est ensuite délivré côté hébergeur. La propagation DNS peut prendre
            quelques minutes à quelques heures.
          </span>
        </div>
      )}
    </section>
  );
}
