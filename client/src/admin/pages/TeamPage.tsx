import { useState } from 'react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { AdminBar } from '../components/AdminBar';
import { PageHero } from '../components/PageHero';
import type { EventSummary, Team, TeamMember, UserRole } from '../lib/types';

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

export function TeamPage() {
  const { user } = useAuth();
  const apiAuthed = useAuthedApi();
  const team = useFetch<Team>(() => apiAuthed.get<Team>('/admin/team'), []);
  const events = useFetch<EventSummary[]>(() => apiAuthed.get<EventSummary[]>('/admin/events'), []);

  return (
    <div className="admin">
      <AdminBar />
      <div className="admin-shell stack">
        <PageHero
          eyebrow="Configuration"
          title="Équipe"
          subtitle="Invitez des collaborateurs, définissez leur niveau d’accès et les événements qu’ils gèrent."
        />

        {team.error && <div className="banner banner-error">{team.error}</div>}

        <InviteForm
          events={events.data ?? []}
          onInvited={() => team.reload()}
        />

        {team.loading && <p className="muted">Chargement…</p>}

        {team.data && (
          <>
            <section className="card stack">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Comptes</h2>
              <div className="stack">
                {team.data.members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    events={events.data ?? []}
                    isSelf={m.id === user?.id}
                    onChanged={() => team.reload()}
                  />
                ))}
              </div>
            </section>

            {team.data.invitations.length > 0 && (
              <section className="card stack">
                <h2 style={{ fontSize: 'var(--text-lg)' }}>Invitations en attente</h2>
                <div className="stack">
                  {team.data.invitations.map((inv) => (
                    <div key={inv.id} className="row-between">
                      <div>
                        <strong>{inv.email}</strong>
                        <span className="muted" style={{ marginLeft: 8, fontSize: 'var(--text-sm)' }}>
                          {ROLE_LABEL[inv.role]} · {inv.eventIds.length} événement(s)
                        </span>
                      </div>
                      <span className="badge">En attente</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
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
      <div className="section-head">
        <span />
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          Inviter un collaborateur
        </button>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="row-between">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Inviter un collaborateur</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Fermer
        </button>
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      {done && <div className="banner banner-success">{done}</div>}
      <div className="grid-2">
        <div className="field">
          <label>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Rôle</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {role !== 'admin' && (
        <div className="field">
          <label>Événements assignés</label>
          <div className="inline-actions">
            {events.length === 0 && <span className="muted">Aucun événement à assigner.</span>}
            {events.map((ev) => (
              <button
                type="button"
                key={ev.id}
                className="chip"
                aria-pressed={eventIds.includes(ev.id)}
                onClick={() => toggleEvent(ev.id)}
              >
                {ev.name}
              </button>
            ))}
          </div>
          <span className="field-hint muted">Un admin accède à tous les événements automatiquement.</span>
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy || !email}>
        {busy ? 'Envoi…' : 'Envoyer l’invitation'}
      </button>
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
    <div className="member-row stack" style={{ opacity: member.active ? 1 : 0.55 }}>
      <div className="row-between">
        <div>
          <strong>{member.fullName}</strong>
          {isSelf && <span className="badge" style={{ marginLeft: 8 }}>Vous</span>}
          {!member.active && <span className="badge badge-warn" style={{ marginLeft: 8 }}>Désactivé</span>}
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{member.email}</div>
        </div>
        <div className="inline-actions">
          <select
            value={member.role}
            disabled={busy || isSelf}
            onChange={(e) => call(() => apiAuthed.post(`/admin/team/${member.id}/role`, { role: e.target.value }))}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy || isSelf}
            onClick={() => call(() => apiAuthed.post(`/admin/team/${member.id}/active`, { active: !member.active }))}
          >
            {member.active ? 'Désactiver' : 'Réactiver'}
          </button>
          {member.role !== 'admin' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Fermer' : 'Événements'}
            </button>
          )}
        </div>
      </div>

      {member.role === 'admin' ? (
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Accès à tous les événements.</span>
      ) : (
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {member.eventIds.length} événement(s) assigné(s)
        </span>
      )}

      {error && <div className="banner banner-error">{error}</div>}

      {editing && member.role !== 'admin' && (
        <div className="stack">
          <div className="inline-actions">
            {events.length === 0 && <span className="muted">Aucun événement.</span>}
            {events.map((ev) => (
              <button
                type="button"
                key={ev.id}
                className="chip"
                aria-pressed={assigned.includes(ev.id)}
                onClick={() => toggleAssigned(ev.id)}
              >
                {ev.name}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() =>
              call(async () => {
                await apiAuthed.put(`/admin/team/${member.id}/events`, { eventIds: assigned });
                setEditing(false);
              })
            }
          >
            Enregistrer les événements
          </button>
        </div>
      )}
    </div>
  );
}
