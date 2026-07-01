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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Super-admin plateforme"
        title="Organisations"
        subtitle={data ? `${data.length} organisation${data.length > 1 ? 's' : ''} cliente${data.length > 1 ? 's' : ''}` : '…'}
        action={
          <Button type="button" onClick={() => setShowInvite((s) => !s)}>
            <Plus size={16} /> Inviter un client
          </Button>
        }
      />

      {showInvite && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={invite} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Invitez un email à créer son propre espace (accès offert, sans paiement). Vous obtenez un
                <strong> lien à partager vous-même</strong> — la personne nomme son organisation et choisit son accès.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email de la personne à inviter</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={inviting} className="self-start">
                {inviting ? 'Génération…' : 'Générer le lien d’invitation'}
              </Button>

              {inviteLink && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="mb-1.5 text-sm text-muted-foreground">
                    Lien d'invitation (valable 14 jours) — copiez-le et envoyez-le à la personne :
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={copyLink}>
                      <Copy size={14} /> Copier
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {loading && <SkeletonCards count={4} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && data.length > 0 && (
        <Card>
          <div className="divide-y">
            {data.map((org) => {
              const current = org.id === user?.organizationId;
              return (
                <div
                  key={org.id}
                  className={cn('flex items-center gap-3 p-4', current && 'bg-muted/40')}
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      {org.name}
                      {current && (
                        <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-800">
                          <Check size={12} /> Actif
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {org.eventCount} événement{org.eventCount > 1 ? 's' : ''} · {org.userCount} membre
                      {org.userCount > 1 ? 's' : ''} · <span>{org.slug}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={current || busyId === org.id}
                    onClick={() => enter(org)}
                  >
                    {current ? 'En cours' : busyId === org.id ? 'Bascule…' : <>Entrer <ArrowRight size={14} /></>}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={current || busyId === org.id}
                    className="text-destructive hover:text-destructive"
                    title={current ? 'Impossible de supprimer votre propre organisation' : "Supprimer l'organisation"}
                    onClick={() => removeOrg(org)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-2">
        {!showDeleteAccount ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => setShowDeleteAccount(true)}
          >
            Supprimer un compte par email…
          </Button>
        ) : (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={deleteAccount} className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Supprimer un compte précis par son email (libère l'email). Si c'est le seul compte de son
                  organisation, l'organisation entière est supprimée.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="delete-email">Email du compte à supprimer</Label>
                  <Input
                    id="delete-email"
                    type="email"
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive">
                  <Trash2 size={14} /> Supprimer ce compte
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
