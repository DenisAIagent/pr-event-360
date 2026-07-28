import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit3,
  Mail,
  MapPin,
  Presentation,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useConfirm } from '../components/Confirm';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useFetch } from '../lib/useFetch';
import type {
  Accreditation,
  EventSummary,
  Lineup,
  PressConference,
  PressConferenceRegistration,
  PressConferenceRegistrationMode,
  PressConferenceRegistrationStatus,
  PressConferenceStatus,
} from '../lib/types';
import { getEventProfile } from '../../lib/eventProfiles';

type AccreditationType = 'presse' | 'photo' | 'video';

interface ConferenceDraft {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  capacity: string;
  registrationMode: PressConferenceRegistrationMode;
  status: PressConferenceStatus;
  allowedAccreditationTypes: AccreditationType[];
  embargoUntil: string;
  livestreamUrl: string;
  participantIds: string[];
}

const EMPTY_DRAFT: ConferenceDraft = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  venue: '',
  capacity: '',
  registrationMode: 'open',
  status: 'draft',
  allowedAccreditationTypes: ['presse', 'photo', 'video'],
  embargoUntil: '',
  livestreamUrl: '',
  participantIds: [],
};

const STATUS_LABEL: Record<PressConferenceStatus, string> = {
  draft: 'Brouillon',
  published: 'Inscriptions ouvertes',
  closed: 'Inscriptions closes',
  completed: 'Terminée',
};

const STATUS_BADGE: Record<PressConferenceStatus, string> = {
  draft: 'badge-neutral',
  published: 'badge-success',
  closed: 'badge-warn',
  completed: 'badge-neutral',
};

const MODE_LABEL: Record<PressConferenceRegistrationMode, string> = {
  open: 'Inscription immédiate',
  approval: 'Validation par le RP',
  invite_only: 'Sur invitation uniquement',
};

const REGISTRATION_LABEL: Record<PressConferenceRegistrationStatus, string> = {
  invited: 'Invité',
  pending: 'À valider',
  registered: 'Inscrit',
  waitlisted: 'Liste d’attente',
  declined: 'Invitation déclinée',
  checked_in: 'Présent',
  cancelled: 'Désisté',
};

const REGISTRATION_STATUSES = Object.keys(REGISTRATION_LABEL) as PressConferenceRegistrationStatus[];

function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function draftFromConference(conference: PressConference): ConferenceDraft {
  return {
    title: conference.title,
    description: conference.description ?? '',
    startsAt: toLocalInput(conference.startsAt),
    endsAt: toLocalInput(conference.endsAt),
    venue: conference.venue ?? '',
    capacity: conference.capacity == null ? '' : String(conference.capacity),
    registrationMode: conference.registrationMode,
    status: conference.status,
    allowedAccreditationTypes: conference.allowedAccreditationTypes,
    embargoUntil: toLocalInput(conference.embargoUntil),
    livestreamUrl: conference.livestreamUrl ?? '',
    participantIds: conference.participants.map((participant) => participant.id),
  };
}

export function PressConferencesTab() {
  const { eventId = '' } = useParams();
  const api = useAuthedApi();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = user?.role === 'admin' || user?.role === 'attache';
  const conferences = useFetch<PressConference[]>(
    () => api.get<PressConference[]>(`/admin/events/${eventId}/press-conferences`),
    [eventId],
  );
  const lineup = useFetch<Lineup>(() => api.get<Lineup>(`/admin/events/${eventId}/lineup`), [eventId]);
  const accreditations = useFetch<Accreditation[]>(
    () => api.get<Accreditation[]>(`/admin/events/${eventId}/accreditations`),
    [eventId],
  );
  const event = useFetch<EventSummary>(() => api.get<EventSummary>(`/admin/events/${eventId}`), [eventId]);
  const profile = getEventProfile(event.data?.eventType);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConferenceDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setFormOpen(true);
  }

  function startEdit(conference: PressConference) {
    setEditingId(conference.id);
    setDraft(draftFromConference(conference));
    setFormError(null);
    setFormOpen(true);
  }

  function toggleAccreditationType(value: AccreditationType) {
    setDraft((current) => ({
      ...current,
      allowedAccreditationTypes: current.allowedAccreditationTypes.includes(value)
        ? current.allowedAccreditationTypes.filter((type) => type !== value)
        : [...current.allowedAccreditationTypes, value],
    }));
  }

  function toggleParticipant(id: string) {
    setDraft((current) => ({
      ...current,
      participantIds: current.participantIds.includes(id)
        ? current.participantIds.filter((participantId) => participantId !== id)
        : [...current.participantIds, id],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = toIso(draft.startsAt);
    if (!startsAt || draft.allowedAccreditationTypes.length === 0) {
      setFormError('Indiquez une date de début et au moins un type d’accréditation.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      startsAt,
      endsAt: toIso(draft.endsAt),
      venue: draft.venue.trim() || null,
      capacity: draft.capacity === '' ? null : Number(draft.capacity),
      registrationMode: draft.registrationMode,
      status: draft.status,
      allowedAccreditationTypes: draft.allowedAccreditationTypes,
      embargoUntil: toIso(draft.embargoUntil),
      livestreamUrl: draft.livestreamUrl.trim() || null,
      participantIds: draft.participantIds,
    };
    try {
      if (editingId) {
        await api.put(`/admin/events/${eventId}/press-conferences/${editingId}`, payload);
        toast.success('Conférence de presse mise à jour.');
      } else {
        await api.post(`/admin/events/${eventId}/press-conferences`, payload);
        toast.success('Conférence de presse créée.');
      }
      setFormOpen(false);
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      conferences.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(conference: PressConference) {
    if (!(await confirm({
      title: 'Supprimer la conférence',
      message: `Supprimer « ${conference.title} » et toutes ses inscriptions ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    }))) return;
    try {
      await api.delete(`/admin/events/${eventId}/press-conferences/${conference.id}`);
      toast.success('Conférence supprimée.');
      conferences.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible.');
    }
  }

  if (conferences.loading || lineup.loading || accreditations.loading) return <SkeletonRows count={4} />;
  if (conferences.error || lineup.error || accreditations.error) {
    return <div className="banner banner-error">{conferences.error ?? lineup.error ?? accreditations.error}</div>;
  }

  const accepted = (accreditations.data ?? []).filter((item) => item.accStatus === 'acceptee');

  return (
    <div className="stack" style={{ maxWidth: 980 }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Conférences de presse</h1>
          <p className="muted" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)' }}>
            Créez une session quand le format est confirmé. Les inscriptions restent indépendantes des demandes d’interview.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            <Presentation size={17} /> Nouvelle conférence
          </button>
        )}
      </div>

      {formOpen && canEdit && (
        <section className="card stack" aria-labelledby="conference-form-title">
          <div className="row-between">
            <h2 id="conference-form-title" style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
              {editingId ? 'Modifier la conférence' : 'Nouvelle conférence de presse'}
            </h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setFormOpen(false)}>Fermer</button>
          </div>
          <form className="stack" onSubmit={save}>
            {formError && <div className="banner banner-error">{formError}</div>}
            <div className="field">
              <label htmlFor="pc-title">Titre *</label>
              <input id="pc-title" value={draft.title} maxLength={200} required autoFocus
                onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="pc-description">Description</label>
              <textarea id="pc-description" value={draft.description} maxLength={5000}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="pc-start">Début *</label>
                <input id="pc-start" type="datetime-local" value={draft.startsAt} required
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pc-end">Fin</label>
                <input id="pc-end" type="datetime-local" value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="pc-venue">Lieu</label>
                <input id="pc-venue" value={draft.venue} maxLength={300}
                  onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pc-capacity">Capacité</label>
                <input id="pc-capacity" type="number" min={0} value={draft.capacity} placeholder="Illimitée"
                  onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="pc-mode">Mode d’inscription</label>
                <select id="pc-mode" value={draft.registrationMode}
                  onChange={(e) => setDraft({ ...draft, registrationMode: e.target.value as PressConferenceRegistrationMode })}>
                  {Object.entries(MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pc-status">Publication</label>
                <select id="pc-status" value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as PressConferenceStatus })}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Types d’accréditation autorisés *</label>
              <div className="filters" style={{ marginBottom: 0 }}>
                {([['presse', 'Journalistes'], ['photo', 'Photographes'], ['video', 'Vidéastes']] as const).map(([value, label]) => (
                  <button key={value} className="chip" type="button"
                    aria-pressed={draft.allowedAccreditationTypes.includes(value)} onClick={() => toggleAccreditationType(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(lineup.data?.artists.length ?? 0) > 0 && (
              <div className="field">
                <label>{profile.participantPlural} concernés</label>
                <div className="filters" style={{ marginBottom: 0 }}>
                  {lineup.data?.artists.map((participant) => (
                    <button key={participant.id} className="chip" type="button"
                      aria-pressed={draft.participantIds.includes(participant.id)} onClick={() => toggleParticipant(participant.id)}>
                      {participant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid-2">
              <div className="field">
                <label htmlFor="pc-embargo">Embargo jusqu’au</label>
                <input id="pc-embargo" type="datetime-local" value={draft.embargoUntil}
                  onChange={(e) => setDraft({ ...draft, embargoUntil: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pc-stream">Lien de diffusion</label>
                <input id="pc-stream" type="url" value={draft.livestreamUrl} placeholder="https://…"
                  onChange={(e) => setDraft({ ...draft, livestreamUrl: e.target.value })} />
              </div>
            </div>
            <div className="inline-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer la conférence'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setFormOpen(false)}>Annuler</button>
            </div>
          </form>
        </section>
      )}

      {(conferences.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Presentation} title="Aucune conférence de presse"
          hint="Créez-en une lorsque l’horaire et le format sont confirmés. Les accréditations et interviews existantes restent inchangées." />
      ) : conferences.data?.map((conference) => (
        <ConferenceCard key={conference.id} conference={conference} eventId={eventId} accepted={accepted}
          canEdit={canEdit} onEdit={() => startEdit(conference)} onDelete={() => void remove(conference)}
          onChanged={conferences.reload} />
      ))}
    </div>
  );
}

function ConferenceCard({ conference, eventId, accepted, canEdit, onEdit, onDelete, onChanged }: {
  conference: PressConference;
  eventId: string;
  accepted: Accreditation[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const capacityText = conference.capacity == null
    ? `${conference.occupied} inscrit${conference.occupied > 1 ? 's' : ''}`
    : `${conference.occupied}/${conference.capacity} places occupées`;
  return (
    <section className="card stack" style={{ gap: 'var(--space-3)' }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="inline-actions" style={{ alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span className={`badge ${STATUS_BADGE[conference.status]}`}>{STATUS_LABEL[conference.status]}</span>
            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{MODE_LABEL[conference.registrationMode]}</span>
          </div>
          <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{conference.title}</h2>
        </div>
        {canEdit && (
          <div className="inline-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={onEdit}><Edit3 size={15} /> Modifier</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onDelete} style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        )}
      </div>
      {conference.description && <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{conference.description}</p>}
      <div className="inline-actions muted" style={{ fontSize: 'var(--text-sm)', gap: 'var(--space-4)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarDays size={15} /> {formatDate(conference.startsAt)}</span>
        {conference.venue && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={15} /> {conference.venue}</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Users size={15} /> {capacityText}</span>
      </div>
      {conference.participants.length > 0 && (
        <div className="filters" style={{ marginBottom: 0 }}>
          {conference.participants.map((participant) => <span className="chip" key={participant.id}>{participant.name}</span>)}
        </div>
      )}
      <div className="inline-actions" style={{ alignItems: 'center' }}>
        <strong style={{ fontSize: 'var(--text-sm)' }}>
          {conference.counts.pending} à valider · {conference.counts.waitlisted} en attente
        </strong>
        {conference.available != null && <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{conference.available} place(s) disponible(s)</span>}
        <button className="btn btn-ghost btn-sm" type="button" style={{ marginLeft: 'auto' }} onClick={() => setOpen((value) => !value)}>
          <CheckSquare size={15} /> Gérer les inscriptions {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && <RegistrationPanel conference={conference} eventId={eventId} accepted={accepted} canEdit={canEdit} onChanged={onChanged} />}
    </section>
  );
}

function RegistrationPanel({ conference, eventId, accepted, canEdit, onChanged }: {
  conference: PressConference;
  eventId: string;
  accepted: Accreditation[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const api = useAuthedApi();
  const toast = useToast();
  const [registrations, setRegistrations] = useState<PressConferenceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRegistrations(await api.get<PressConferenceRegistration[]>(
        `/admin/events/${eventId}/press-conferences/${conference.id}/registrations`,
      ));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement des inscriptions impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [conference.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const registrationIds = useMemo(() => new Set(registrations.map((item) => item.journalistId)), [registrations]);
  const eligible = accepted.filter((item) => {
    const type = item.accreditationType ?? 'presse';
    return conference.allowedAccreditationTypes.includes(type) && !registrationIds.has(item.id);
  });

  async function invite() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const result = await api.post<{ invited: number }>(
        `/admin/events/${eventId}/press-conferences/${conference.id}/invitations`,
        { journalistIds: selected },
      );
      toast.success(`${result.invited} invitation(s) envoyée(s).`);
      setSelected([]);
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(journalistId: string, status: PressConferenceRegistrationStatus) {
    try {
      await api.put(
        `/admin/events/${eventId}/press-conferences/${conference.id}/registrations/${journalistId}`,
        { status },
      );
      toast.success('Statut mis à jour.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  }

  if (loading) return <p className="muted">Chargement des inscriptions…</p>;

  return (
    <div className="stack" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 'var(--space-3)' }}>
      {canEdit && (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <div className="row-between">
            <div>
              <strong>Inviter des accrédités</strong>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Seules les accréditations acceptées et éligibles apparaissent.</div>
            </div>
            <button className="btn btn-primary btn-sm" type="button" disabled={busy || selected.length === 0} onClick={() => void invite()}>
              <Mail size={15} /> Envoyer {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          </div>
          {eligible.length === 0 ? <span className="muted">Aucun autre accrédité à inviter.</span> : (
            <div className="filters" style={{ marginBottom: 0 }}>
              {eligible.map((item) => (
                <label className="chip" key={item.id} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.includes(item.id)}
                    onChange={() => setSelected((current) => current.includes(item.id)
                      ? current.filter((id) => id !== item.id) : [...current, item.id])} />{' '}
                  {item.firstName} {item.lastName ?? ''}{item.media ? ` · ${item.media}` : ''}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        {registrations.length === 0 ? <p className="muted">Aucune inscription pour l’instant.</p> : (
          <table className="table">
            <thead><tr><th>Journaliste</th><th>Média</th><th>Type</th><th>Statut</th></tr></thead>
            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.journalistId}>
                  <td><strong>{registration.firstName} {registration.lastName ?? ''}</strong><br />
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{registration.email}</span></td>
                  <td>{registration.media ?? '—'}</td>
                  <td>{registration.accreditationType ?? 'presse'}</td>
                  <td>{canEdit ? (
                    <select className="status-select" value={registration.status}
                      onChange={(e) => void changeStatus(registration.journalistId, e.target.value as PressConferenceRegistrationStatus)}>
                      {REGISTRATION_STATUSES.map((status) => <option key={status} value={status}>{REGISTRATION_LABEL[status]}</option>)}
                    </select>
                  ) : <span className="badge badge-neutral">{REGISTRATION_LABEL[registration.status]}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
