import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import type { ArtistWithSlots, Lineup, Stage } from '../lib/types';

interface WindowDraft {
  day: string;
  startTime: string;
  endTime: string;
}

export function LineupTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<Lineup>(
    () => apiAuthed.get<Lineup>(`/admin/events/${eventId}/lineup`),
    [eventId],
  );

  // Wizard guidé : on crée d'abord les scènes, puis on passe aux artistes.
  // Un événement qui a déjà des scènes démarre directement à l'étape « artistes ».
  const [step, setStep] = useState<'stages' | 'artists'>('stages');
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current && data) {
      initRef.current = true;
      if (data.stages.length > 0) setStep('artists');
    }
  }, [data]);

  const [stageName, setStageName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistStage, setArtistStage] = useState('');
  const [artistQuota, setArtistQuota] = useState('');
  const [artistPhotoQuota, setArtistPhotoQuota] = useState('');
  const [artistVideoQuota, setArtistVideoQuota] = useState('');
  const [windows, setWindows] = useState<WindowDraft[]>([{ day: '', startTime: '', endTime: '' }]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!stageName) return;
    await apiAuthed.post(`/admin/events/${eventId}/stages`, { name: stageName });
    setStageName('');
    reload();
  }

  function setWindow(i: number, patch: Partial<WindowDraft>) {
    setWindows((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  async function addArtist(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const validWindows = windows.filter((w) => w.day && w.startTime && w.endTime);
      await apiAuthed.post(`/admin/events/${eventId}/artists`, {
        name: artistName,
        stageId: artistStage || null,
        itwQuota: artistQuota ? Number(artistQuota) : null,
        photoQuota: artistPhotoQuota ? Number(artistPhotoQuota) : null,
        videoQuota: artistVideoQuota ? Number(artistVideoQuota) : null,
        windows: validWindows,
      });
      setArtistName('');
      setArtistStage('');
      setArtistQuota('');
      setArtistPhotoQuota('');
      setArtistVideoQuota('');
      setWindows([{ day: '', startTime: '', endTime: '' }]);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  const stages = data?.stages ?? [];
  const artists = data?.artists ?? [];
  const unassigned = artists.filter((a) => !a.stageId);
  const noStage = stages.length === 0;
  const stepIndex = step === 'stages' ? 0 : 1;

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      {/* Stepper : étapes cliquables pour guider l'utilisateur */}
      <ol className="wizard-steps">
        {['Scènes', 'Artistes & lineup'].map((label, i) => (
          <li
            key={label}
            className={i === stepIndex ? 'current' : i < stepIndex ? 'done' : ''}
            onClick={() => setStep(i === 0 ? 'stages' : 'artists')}
            style={{ cursor: 'pointer' }}
          >
            <span className="wizard-step-num">{i < stepIndex ? <Check size={14} /> : i + 1}</span>
            <span className="wizard-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {step === 'stages' ? (
        <>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Étape 1 — créez vos scènes, une à une. Vous pourrez toujours en ajouter ou les corriger plus tard.
          </p>
          <section className="card">
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Scènes</h3>
            <form className="inline-actions" onSubmit={addStage} style={{ marginBottom: 'var(--space-3)' }}>
              <input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Nom de la scène"
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" type="submit">
                Ajouter la scène
              </button>
            </form>
            <div className="stack">
              {stages.map((s) => (
                <StageRow key={s.id} stage={s} eventId={eventId} onChanged={reload} />
              ))}
              {noStage && <span className="muted">Aucune scène pour l’instant.</span>}
            </div>
          </section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {noStage
                ? 'Ajoutez vos scènes, ou passez directement si vous n’en avez pas.'
                : `${stages.length} scène${stages.length > 1 ? 's' : ''} créée${stages.length > 1 ? 's' : ''}. Avez-vous terminé ?`}
            </span>
            <button className="btn btn-primary" onClick={() => setStep('artists')}>
              Terminé — passer aux artistes <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setStep('stages')}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} /> Revenir aux scènes
          </button>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Étape 2 — ajoutez vos artistes et rattachez chacun à une scène.
          </p>

          <section className="card">
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Ajouter un artiste</h3>
            <form className="stack" onSubmit={addArtist}>
              {formError && <div className="banner banner-error">{formError}</div>}
              <div className="field">
                <label>Nom *</label>
                <input value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Scène</label>
                  <select value={artistStage} onChange={(e) => setArtistStage(e.target.value)}>
                    <option value="">— Sans scène</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quota interviews (sinon défaut)</label>
                  <input type="number" min={0} value={artistQuota} onChange={(e) => setArtistQuota(e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Quota photographes</label>
                  <input
                    type="number"
                    min={0}
                    value={artistPhotoQuota}
                    onChange={(e) => setArtistPhotoQuota(e.target.value)}
                    placeholder="illimité"
                  />
                </div>
                <div className="field">
                  <label>Quota vidéastes</label>
                  <input
                    type="number"
                    min={0}
                    value={artistVideoQuota}
                    onChange={(e) => setArtistVideoQuota(e.target.value)}
                    placeholder="illimité"
                  />
                </div>
              </div>
              <p className="hint" style={{ marginTop: 'calc(-1 * var(--space-2))' }}>
                Quotas propres à l’artiste (interviews, photographes dans le pit, vidéastes).
                Laisser vide = <strong>illimité</strong>. Au-delà du quota, les demandes passent en liste d’attente.
              </p>
              <div className="field">
                <label>Tranches de disponibilité → créneaux générés</label>
                {windows.map((w, i) => (
                  <div key={i} className="inline-actions" style={{ marginBottom: 'var(--space-1)' }}>
                    <input type="date" value={w.day} onChange={(e) => setWindow(i, { day: e.target.value })} />
                    <input type="time" value={w.startTime} onChange={(e) => setWindow(i, { startTime: e.target.value })} />
                    <input type="time" value={w.endTime} onChange={(e) => setWindow(i, { endTime: e.target.value })} />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setWindows((ws) => [...ws, { day: '', startTime: '', endTime: '' }])}
                >
                  + Tranche
                </button>
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy || !artistName}>
                {busy ? 'Ajout…' : "Ajouter l'artiste"}
              </button>
            </form>
          </section>

          <section className="stack">
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Lineup ({artists.length})</h3>
            {artists.length === 0 && (
              <p className="muted">Aucun artiste — ajoutez-en un ci-dessus pour gérer les demandes d’interview.</p>
            )}
            {stages.map((stage) => {
              const arts = artists.filter((a) => a.stageId === stage.id);
              return (
                <div key={stage.id}>
                  <h4 style={{ fontSize: 'var(--text-base)', margin: '0 0 var(--space-2)' }}>
                    {stage.name}{' '}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      · {arts.length} artiste{arts.length > 1 ? 's' : ''}
                    </span>
                  </h4>
                  {arts.length === 0 ? (
                    <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Aucun artiste sur cette scène.</span>
                  ) : (
                    <div className="stack">
                      {arts.map((a) => (
                        <ArtistRow key={a.id} artist={a} stages={stages} eventId={eventId} onChanged={reload} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {unassigned.length > 0 && (
              <div>
                <h4 className="muted" style={{ fontSize: 'var(--text-base)', margin: '0 0 var(--space-2)' }}>
                  Sans scène · {unassigned.length} artiste{unassigned.length > 1 ? 's' : ''}
                </h4>
                <div className="stack">
                  {unassigned.map((a) => (
                    <ArtistRow key={a.id} artist={a} stages={stages} eventId={eventId} onChanged={reload} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Scène : affichage + renommage / suppression en cas d'erreur de saisie. */
function StageRow({ stage, eventId, onChanged }: { stage: Stage; eventId: string; onChanged: () => void }) {
  const api = useAuthedApi();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/stages/${stage.id}`, { name: name.trim() });
      toast.success('Scène renommée.');
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer la scène « ${stage.name} » ? Les artistes rattachés seront dé-rattachés.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/events/${eventId}/stages/${stage.id}`);
      toast.success('Scène supprimée.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-actions" style={{ width: '100%' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !name.trim()}>
          OK
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setName(stage.name); }} disabled={busy}>
          Annuler
        </button>
      </span>
    );
  }

  return (
    <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {stage.name}
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        Renommer
      </button>
      <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} style={{ color: 'var(--color-danger)' }}>
        Supprimer
      </button>
    </span>
  );
}

/** Artiste : affichage + correction (nom, scène, quota) / suppression. */
function ArtistRow({
  artist,
  stages,
  eventId,
  onChanged,
}: {
  artist: ArtistWithSlots;
  stages: Stage[];
  eventId: string;
  onChanged: () => void;
}) {
  const api = useAuthedApi();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(artist.name);
  const [stageId, setStageId] = useState(artist.stageId ?? '');
  const [quota, setQuota] = useState(artist.itwQuota != null ? String(artist.itwQuota) : '');
  const [photoQuota, setPhotoQuota] = useState(artist.photoQuota != null ? String(artist.photoQuota) : '');
  const [videoQuota, setVideoQuota] = useState(artist.videoQuota != null ? String(artist.videoQuota) : '');
  const [busy, setBusy] = useState(false);

  const stageName = stages.find((s) => s.id === artist.stageId)?.name ?? '—';
  const fmt = (n: number | null) => (n != null ? n : '∞');

  function resetDraft() {
    setName(artist.name);
    setStageId(artist.stageId ?? '');
    setQuota(artist.itwQuota != null ? String(artist.itwQuota) : '');
    setPhotoQuota(artist.photoQuota != null ? String(artist.photoQuota) : '');
    setVideoQuota(artist.videoQuota != null ? String(artist.videoQuota) : '');
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/artists/${artist.id}`, {
        name: name.trim(),
        stageId: stageId || null,
        itwQuota: quota ? Number(quota) : null,
        photoQuota: photoQuota ? Number(photoQuota) : null,
        videoQuota: videoQuota ? Number(videoQuota) : null,
      });
      toast.success('Artiste mis à jour.');
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer « ${artist.name} » et ses créneaux ?`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/events/${eventId}/artists/${artist.id}`);
      toast.success('Artiste supprimé.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="card stack" style={{ padding: 'var(--space-3)' }}>
        <div className="field">
          <label>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Scène</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">—</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quota interviews</label>
            <input type="number" min={0} value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="défaut" />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Quota photographes</label>
            <input type="number" min={0} value={photoQuota} onChange={(e) => setPhotoQuota(e.target.value)} placeholder="illimité" />
          </div>
          <div className="field">
            <label>Quota vidéastes</label>
            <input type="number" min={0} value={videoQuota} onChange={(e) => setVideoQuota(e.target.value)} placeholder="illimité" />
          </div>
        </div>
        <div className="inline-actions">
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !name.trim()}>
            Enregistrer
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); resetDraft(); }} disabled={busy}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 'var(--space-3)' }}>
      <div className="section-head" style={{ marginBottom: 'var(--space-2)' }}>
        <strong>{artist.name}</strong>
        <span className="inline-actions">
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{stageName}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Modifier
          </button>
          <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} style={{ color: 'var(--color-danger)' }}>
            Supprimer
          </button>
        </span>
      </div>
      <div className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
        Quotas — interviews : {artist.itwQuota ?? 'défaut'} · photo : {fmt(artist.photoQuota)} · vidéo : {fmt(artist.videoQuota)}
      </div>
      {artist.slots.length === 0 ? (
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Aucun créneau (ajoutez des tranches de disponibilité).
        </span>
      ) : (
        <div className="inline-actions">
          {artist.slots.map((s) => (
            <span key={s.id} className="chip" aria-pressed={false} style={{ cursor: 'default' }}>
              {s.day} · {s.startTime.slice(0, 5)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
