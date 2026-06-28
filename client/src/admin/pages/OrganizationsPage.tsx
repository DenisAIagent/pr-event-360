import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Check, Plus } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { SkeletonCards } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { ApiError } from '../../lib/api';
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
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useFetch<OrganizationSummary[]>(
    () => apiAuthed.get<OrganizationSummary[]>('/admin/organizations'),
    [],
  );

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim() || !newAdminEmail.trim()) return;
    setCreating(true);
    try {
      await apiAuthed.post('/admin/organizations', {
        orgName: newOrgName.trim(),
        adminEmail: newAdminEmail.trim(),
      });
      toast.success(`Organisation « ${newOrgName.trim()} » créée. Invitation envoyée à ${newAdminEmail.trim()}.`);
      setNewOrgName('');
      setNewAdminEmail('');
      setShowCreate(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Création impossible.');
    } finally {
      setCreating(false);
    }
  }

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
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
            <Plus size={16} /> Créer une organisation
          </button>
        }
      />

      {showCreate && (
        <form onSubmit={createOrg} className="org-create card stack">
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Crée une organisation (active) et envoie une invitation d'admin par email — onboarding manuel,
            sans paiement.
          </p>
          <div className="field">
            <label>Nom de l'organisation</label>
            <input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Email de l'administrateur</label>
            <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Création…' : "Créer + inviter l'admin"}
          </button>
        </form>
      )}

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
