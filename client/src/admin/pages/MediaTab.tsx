import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { uploadToCloudinary } from '../lib/upload';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { AssetKind, EventAsset, UploadSignature } from '../lib/types';

const KINDS: { value: AssetKind; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
  { value: 'logo', label: 'Logo' },
  { value: 'press_kit', label: 'Dossier de presse' },
  { value: 'other', label: 'Autre' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<AssetKind, string>;

export function MediaTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<EventAsset[]>(
    () => apiAuthed.get<EventAsset[]>(`/admin/events/${eventId}/assets`),
    [eventId],
  );

  const [kind, setKind] = useState<AssetKind>('photo');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const sig = await apiAuthed.post<UploadSignature>(`/admin/events/${eventId}/assets/sign`);
      const up = await uploadToCloudinary(file, sig);
      await apiAuthed.post(`/admin/events/${eventId}/assets`, {
        kind,
        title: title || file.name,
        url: up.url,
        thumbnailUrl: up.thumbnailUrl,
        mime: up.mime,
        bytes: up.bytes,
        source: 'upload',
      });
      setMsg(`« ${title || file.name} » ajouté.`);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Ajouter un média</h2>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Photos, vidéos, logos et dossier de presse. Ils apparaîtront dans la newsroom publique.
        </p>
        {err && <div className="banner banner-error">{err}</div>}
        {msg && <div className="banner banner-success">{msg}</div>}
        <div className="grid-2">
          <div className="field">
            <label>Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Titre (optionnel)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du fichier par défaut" />
          </div>
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Choisir un fichier…
          </button>
          {busy && <span className="muted">Upload en cours…</span>}
          <input
            ref={fileRef}
            type="file"
            disabled={busy}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
        </div>
      </section>

      {loading && <p className="muted">Chargement…</p>}
      {error && <div className="banner banner-error">{error}</div>}

      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Médiathèque ({data?.length ?? 0})</h2>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {data?.map((a) => (
            <AssetCard key={a.id} asset={a} kindLabel={KIND_LABEL[a.kind]} eventId={eventId} onDeleted={reload} />
          ))}
          {data?.length === 0 && !loading && (
            <EmptyState
              icon={ImageIcon}
              title="Aucun média pour l’instant"
              hint="Importez vos premières photos, vidéos et logos ci-dessus — les journalistes pourront les télécharger depuis la newsroom."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function AssetCard({
  asset,
  kindLabel,
  eventId,
  onDeleted,
}: {
  asset: EventAsset;
  kindLabel: string;
  eventId: string;
  onDeleted: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/assets/${asset.id}`);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack" style={{ padding: 'var(--space-2)' }}>
      <div
        style={{
          aspectRatio: '4/3',
          background: '#f0f0f3',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {asset.thumbnailUrl ? (
          <img src={asset.thumbnailUrl} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{kindLabel}</span>
        )}
      </div>
      <strong style={{ fontSize: 'var(--text-sm)' }}>{asset.title}</strong>
      <span className="badge">{kindLabel}</span>
      <div className="inline-actions">
        <a href={asset.url} target="_blank" rel="noreferrer" className="auth-link">
          Ouvrir
        </a>
        <button className="btn btn-ghost btn-sm" onClick={del} disabled={busy}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
