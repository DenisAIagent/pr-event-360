import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import type { EventSummary, Invitation, Team, TeamMember, UserRole } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'attache', label: 'Attaché de presse' },
  { value: 'assistant', label: 'Assistant' },
];
const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrateur',
  attache: 'Attaché de presse',
  assistant: 'Assistant',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function TeamPage() {
  const { user } = useAuth();
  const apiAuthed = useAuthedApi();
  const team = useFetch<Team>(() => apiAuthed.get<Team>('/admin/team'), []);
  const events = useFetch<EventSummary[]>(() => apiAuthed.get<EventSummary[]>('/admin/events'), []);

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Configuration"
        title="Équipe"
        subtitle="Invitez des collaborateurs, définissez leur niveau d’accès et les événements qu’ils gèrent."
      />

      {team.error && (
        <Alert variant="destructive">
          <AlertDescription>{team.error}</AlertDescription>
        </Alert>
      )}

      <InviteForm events={events.data ?? []} onInvited={() => team.reload()} />

      {team.loading && <p className="text-muted-foreground">Chargement…</p>}

      {team.data && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Comptes</h2>
            <Card>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.data.members.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        events={events.data ?? []}
                        isSelf={m.id === user?.id}
                        onChanged={() => team.reload()}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {team.data.invitations.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Invitations en attente</h2>
              <Card>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Détails</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.data.invitations.map((inv) => (
                        <InvitationRow key={inv.id} inv={inv} onChanged={() => team.reload()} />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InvitationRow({ inv, onChanged }: { inv: Invitation; onChanged: () => void }) {
  const api = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      await api.post(`/admin/team/invitations/${inv.id}/resend`);
      toast.success(`Invitation renvoyée à ${inv.email}.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Renvoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!(await confirm({ message: `Annuler l'invitation de ${inv.email} ?`, confirmLabel: 'Annuler l’invitation', danger: true }))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/team/invitations/${inv.id}`);
      toast.success('Invitation annulée.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Annulation impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{inv.email}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {ROLE_LABEL[inv.role]} · {inv.eventIds.length} événement(s)
      </TableCell>
      <TableCell>
        <Badge variant="secondary">En attente</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={resend} disabled={busy}>
            Renvoyer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={cancel}
            disabled={busy}
          >
            Annuler
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function InviteForm({ events, onInvited }: { events: EventSummary[]; onInvited: () => void }) {
  const apiAuthed = useAuthedApi();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('attache');
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function toggleEvent(id: string) {
    setEventIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await apiAuthed.post('/admin/team/invite', { email, role, eventIds });
      setDone(`Invitation envoyée à ${email}.`);
      setEmail('');
      setEventIds([]);
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-3 flex items-center justify-end gap-3">
        <Button size="sm" onClick={() => setOpen(true)}>
          Inviter un collaborateur
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Inviter un collaborateur</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {done && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {done}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {role !== 'admin' && (
            <div className="grid gap-2">
              <Label>Événements assignés</Label>
              <div className="flex flex-col gap-2">
                {events.length === 0 && (
                  <span className="text-sm text-muted-foreground">Aucun événement à assigner.</span>
                )}
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`invite-ev-${ev.id}`}
                      checked={eventIds.includes(ev.id)}
                      onCheckedChange={() => toggleEvent(ev.id)}
                    />
                    <Label htmlFor={`invite-ev-${ev.id}`} className="font-normal">
                      {ev.name}
                    </Label>
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Un admin accède à tous les événements automatiquement.
              </span>
            </div>
          )}
          <Button type="submit" disabled={busy || !email}>
            {busy ? 'Envoi…' : 'Envoyer l’invitation'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function MemberRow({
  member,
  events,
  isSelf,
  onChanged,
}: {
  member: TeamMember;
  events: EventSummary[];
  isSelf: boolean;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [assigned, setAssigned] = useState<string[]>(member.eventIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  function toggleAssigned(id: string) {
    setAssigned((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <>
      <TableRow className={member.active ? undefined : 'opacity-60'}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.fullName}</span>
                {isSelf && <Badge variant="outline">Vous</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
              <div className="text-xs text-muted-foreground">
                {member.role === 'admin'
                  ? 'Accès à tous les événements.'
                  : `${member.eventIds.length} événement(s) assigné(s)`}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={member.role}
            disabled={busy || isSelf}
            onValueChange={(v) => call(() => apiAuthed.post(`/admin/team/${member.id}/role`, { role: v }))}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          {member.active ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Actif</Badge>
          ) : (
            <Badge variant="secondary">Désactivé</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={busy || isSelf}
                onSelect={() => call(() => apiAuthed.post(`/admin/team/${member.id}/active`, { active: !member.active }))}
              >
                {member.active ? 'Désactiver' : 'Réactiver'}
              </DropdownMenuItem>
              {member.role !== 'admin' && (
                <DropdownMenuItem onSelect={() => setEditing(true)}>Événements</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={busy || isSelf}
                onSelect={async () => {
                  if (
                    !(await confirm({
                      title: 'Supprimer le compte',
                      message: `Supprimer définitivement le compte de ${member.fullName} (${member.email}) ? Ses événements (s'il en possède) vous seront réattribués. Cette action est irréversible.`,
                      confirmLabel: 'Supprimer',
                      danger: true,
                    }))
                  )
                    return;
                  call(() => apiAuthed.delete(`/admin/team/${member.id}`));
                }}
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {error && !editing && (
        <TableRow>
          <TableCell colSpan={4}>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
      )}

      {member.role !== 'admin' && (
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Événements assignés</DialogTitle>
              <DialogDescription>{member.fullName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {events.length === 0 && <span className="text-sm text-muted-foreground">Aucun événement.</span>}
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`member-${member.id}-ev-${ev.id}`}
                    checked={assigned.includes(ev.id)}
                    onCheckedChange={() => toggleAssigned(ev.id)}
                  />
                  <Label htmlFor={`member-${member.id}-ev-${ev.id}`} className="font-normal">
                    {ev.name}
                  </Label>
                </div>
              ))}
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                disabled={busy}
                onClick={() =>
                  call(async () => {
                    await apiAuthed.put(`/admin/team/${member.id}/events`, { eventIds: assigned });
                    setEditing(false);
                  })
                }
              >
                Enregistrer les événements
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
