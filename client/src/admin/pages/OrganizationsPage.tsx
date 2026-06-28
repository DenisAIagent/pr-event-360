import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Check } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { SkeletonCards } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import type { OrganizationSummary } from '../lib/types';

/**
 * Console super-admin plateforme : liste toutes les organisations clientes et permet
 * de basculer dans l'une d'elles (le jeton est réémis avec son contexte).
 */
export function OrganizationsPage() {
  const { user, switchOrg } = useAuth();
  const apiAuthed = useAuthedApi();
  const navigate = useNavigate();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, error } = useFetch<OrganizationSummary[]>(
    () => apiAuthed.get<OrganizationSummary[]>('/admin/organizations'),
    [],
  );

  async function enter(org: OrganizationSummary) {
    setBusyId(org.id);
    try {
      await switchOrg(org.id);
      toast.success(`Vous travaillez dans « ${org.name} ».`);
      navigate('/admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bascule impossible.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <PageHero
        eyebrow="Super-admin plateforme"
        title="Organisations"
        subtitle={data ? `${data.length} organisation${data.length > 1 ? 's' : ''} cliente${data.length > 1 ? 's' : ''}` : '…'}
      />

      {loading && <SkeletonCards count={4} />}
      {error && <div className="banner banner-error">{error}</div>}

      <div className="org-list">
        {data?.map((org) => {
          const current = org.id === user?.organizationId;
          return (
            <div key={org.id} className={`org-row${current ? ' org-row-current' : ''}`}>
              <div className="org-row-icon">
                <Building2 size={18} />
              </div>
              <div className="org-row-main">
                <div className="org-row-name">
                  {org.name}
                  {current && <span className="org-row-badge"><Check size={12} /> Actif</span>}
                </div>
                <div className="org-row-meta">
                  {org.eventCount} événement{org.eventCount > 1 ? 's' : ''} · {org.userCount} membre
                  {org.userCount > 1 ? 's' : ''} · <span className="muted">{org.slug}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={current || busyId === org.id}
                onClick={() => enter(org)}
              >
                {current ? 'En cours' : busyId === org.id ? 'Bascule…' : <>Entrer <ArrowRight size={14} /></>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
