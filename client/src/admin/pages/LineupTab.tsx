import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Lineup } from '../lib/types';

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

  const [stageName, setStageName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistStage, setArtistStage] = useState('');
  const [artistQuota, setArtistQuota] = useState('');
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
        windows: validWindows,
      });
      setArtistName('');
      setArtistStage('');
      setArtistQuota('');
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

  const stageName_ = (id: string | null) => data?.stages.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="stack">
        <section className="card">
          <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Scènes</h3>
          <form className="inline-actions" onSubmit={addStage} style={{ marginBottom: 'var(--space-3)' }}>
            <input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Nom de la scène" style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" type="submit">
              Ajouter
            </button>
          </form>
          <div className="inline-actions">
            {data?.stages.map((s) => (
              <span key={s.id} className="chip" aria-pressed={false}>
                {s.name}
              </span>
            ))}
            {data?.stages.length === 0 && <span className="muted">Aucune scène.</span>}
          </div>
        </section>

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
                  <option value="">—</option>
                  {data?.stages.map((s) => (
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
      </div>

      <section className="stack">
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Lineup ({data?.artists.length ?? 0})</h3>
        {data?.artists.map((a) => (
          <div key={a.id} className="card" style={{ padding: 'var(--space-3)' }}>
            <div className="section-head" style={{ marginBottom: 'var(--space-2)' }}>
              <strong>{a.name}</strong>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {stageName_(a.stageId)}
              </span>
            </div>
            {a.slots.length === 0 ? (
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Aucun créneau (ajoutez des tranches de disponibilité).
              </span>
            ) : (
              <div className="inline-actions">
                {a.slots.map((s) => (
                  <span key={s.id} className="chip" aria-pressed={false} style={{ cursor: 'default' }}>
                    {s.day} · {s.startTime.slice(0, 5)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {data?.artists.length === 0 && <p className="muted">Aucun artiste.</p>}
      </section>
    </div>
  );
}
