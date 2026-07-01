import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Check, Plus, Copy, Trash2 } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { SkeletonCards } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
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
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const { data, loading, error, reload } = useFetch<OrganizationSummary[]>(
    () => apiAuthed.get<OrganizationSummary[]>('/admin/organizations'),
    [],
  );

  async function removeOrg(org: OrganizationSummary) {
    if (
      !(await confirm({
        title: 'Supprimer l’organisation',
        message: `Supprimer DÉFINITIVEMENT l'organisation « ${org.name} » ? ${org.eventCount} événement(s), ${org.userCount} compte(s) et TOUTES leurs données (journalistes, demandes, médias…) seront effacés. Action irréversible.`,
        confirmLabel: 'Tout supprimer',
        danger: true,
      }))
    )
      return;
    setBusyId(org.id);
    try {
      await apiAuthed.delete(`/admin/organizations/${org.id}`);
      toast.success(`Organisation « ${org.name} » supprimée.`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    const email = deleteEmail.trim();
    if (!email) return;
    if (
      !(await confirm({
        title: 'Supprimer le compte',
        message: `Supprimer le compte « ${email} » ? Si c'est le seul compte de son organisation, toute l'organisation et ses données seront supprimées. Irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true,
      }))
    )
      return;
    try {
      const r = await apiAuthed.post<{ deletedOrg: boolean }>('/admin/organizations/delete-account', { email });
      toast.success(r.deletedOrg ? `Compte + organisation supprimés. Email libéré.` : `Compte « ${email} » supprimé.`);
      setDeleteEmail('');
      setShowDeleteAccount(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteLink(null);
    try {
      const r = await apiAuthed.post<{ inviteUrl: string }>('/admin/organizations/invite', {
        email: inviteEmail.trim(),
      });
      setInviteLink(r.inviteUrl);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invitation impossible.');
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Lien copié.');
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement.');
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
          <button type="button" className="btn btn-primary" onClick={() => setShowInvite((s) => !s)}>
            <Plus size={16} /> Inviter un client
          </button>
        }
      />

      {showInvite && (
        <form onSubmit={invite} className="org-create card stack">
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Invitez un email à créer son propre espace (accès offert, sans paiement). Vous obtenez un
            <strong> lien à partager vous-même</strong> — la personne nomme son organisation et choisit son accès.
          </p>
          <div className="field">
            <label>Email de la personne à inviter</label>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="btn btn-primary" disabled={inviting}>
            {inviting ? 'Génération…' : 'Générer le lien d’invitation'}
          </button>

          {inviteLink && (
            <div className="invite-link">
              <p className="muted" style={{ margin: '0 0 6px', fontSize: 'var(--text-sm)' }}>
                Lien d'invitation (valable 14 jours) — copiez-le et envoyez-le à la personne :
              </p>
              <div className="invite-link-row">
                <input value={inviteLink} readOnly onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
                  <Copy size={14} /> Copier
                </button>
              </div>
            </div>
          )}
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
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={current || busyId === org.id}
                style={{ color: 'var(--color-danger)' }}
                title={current ? 'Impossible de supprimer votre propre organisation' : "Supprimer l'organisation"}
                onClick={() => removeOrg(org)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        {!showDeleteAccount ? (
          <button type="button" className="auth-link" onClick={() => setShowDeleteAccount(true)}>
            Supprimer un compte par email…
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="org-create card stack">
            <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              Supprimer un compte précis par son email (libère l'email). Si c'est le seul compte de son
              organisation, l'organisation entière est supprimée.
            </p>
            <div className="field">
              <label>Email du compte à supprimer</label>
              <input type="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={14} /> Supprimer ce compte
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
