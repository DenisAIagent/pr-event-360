import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventBranding, EventSettings } from '../lib/types';

const DEFAULT_ACCENT = '#5b4bdb';
const DEFAULT_BG = '#f7f4ef';
const DEFAULT_TEXT = '#1b1b2b';
const MAX_LOGO_BYTES = 250_000; // ~250 ko ; encodé en data URL dans la page publique
const MAX_BG_BYTES = 1_500_000; // ~1,5 Mo pour une image de fond

export function BrandingTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error } = useFetch<EventSettings>(
    () => apiAuthed.get<EventSettings>(`/admin/events/${eventId}/settings`),
    [eventId],
  );
  const ev = useFetch(() => apiAuthed.get<{ name: string }>(`/admin/events/${eventId}`), [eventId]);

  if (loading || !data) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return <BrandingEditor eventId={eventId} initial={data.branding} eventName={ev.data?.name ?? 'Événement'} />;
}

function BrandingEditor({
  eventId,
  initial,
  eventName,
}: {
  eventId: string;
  initial: EventBranding;
  eventName: string;
}) {
  const apiAuthed = useAuthedApi();
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(initial.bgImageUrl);
  const [accent, setAccent] = useState(initial.accentColor ?? DEFAULT_ACCENT);
  const [bg, setBg] = useState(initial.bgColor ?? DEFAULT_BG);
  const [text, setText] = useState(initial.textColor ?? DEFAULT_TEXT);
  const [useAccent, setUseAccent] = useState(initial.accentColor != null);
  const [useBg, setUseBg] = useState(initial.bgColor != null);
  const [useText, setUseText] = useState(initial.textColor != null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function readFileToState(
    e: React.ChangeEvent<HTMLInputElement>,
    maxBytes: number,
    set: (v: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`Fichier trop lourd (${Math.round(file.size / 1024)} ko). Maximum ${Math.round(maxBytes / 1024)} ko.`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => set(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiAuthed.put(`/admin/events/${eventId}/branding`, {
        logoUrl: logoUrl || null,
        accentColor: useAccent ? accent : null,
        bgColor: useBg ? bg : null,
        textColor: useText ? text : null,
        bgImageUrl: bgImageUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  // Style appliqué à l'aperçu (mêmes variables que les pages publiques).
  const previewStyle: React.CSSProperties = {
    backgroundColor: useBg ? bg : 'var(--color-bg)',
    ...(bgImageUrl
      ? {
          backgroundImage: `url("${bgImageUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
    ['--p-accent' as string]: useAccent ? accent : 'var(--color-accent)',
    ['--p-ink' as string]: useText ? text : 'var(--color-ink)',
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card stack">
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Apparence de la page publique</h3>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
          Personnalisez le formulaire d'accréditation et l'espace journaliste aux couleurs de l'événement.
        </p>
        {error && <div className="banner banner-error">{error}</div>}
        {saved && <div className="banner banner-success">Apparence enregistrée.</div>}

        <div className="field">
          <label>Logo</label>
          <div className="inline-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              Choisir un fichier…
            </button>
            {logoUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogoUrl(null)}>
                Retirer
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => readFileToState(e, MAX_LOGO_BYTES, setLogoUrl)}
              style={{ display: 'none' }}
            />
          </div>
          <span className="hint">PNG, JPG ou SVG · 250 ko max. Ou collez une URL ci-dessous.</span>
          <input
            type="url"
            placeholder="https://… (URL du logo, optionnel)"
            value={logoUrl && !logoUrl.startsWith('data:') ? logoUrl : ''}
            onChange={(e) => setLogoUrl(e.target.value || null)}
          />
        </div>

        <div className="field">
          <label>Image de fond</label>
          <div className="inline-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => bgFileRef.current?.click()}>
              Choisir un fichier…
            </button>
            {bgImageUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBgImageUrl(null)}>
                Retirer
              </button>
            )}
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => readFileToState(e, MAX_BG_BYTES, setBgImageUrl)}
              style={{ display: 'none' }}
            />
          </div>
          <span className="hint">1,5 Mo max. Conseil : choisissez une couleur de texte contrastée par-dessus.</span>
          <input
            type="url"
            placeholder="https://… (URL de l'image, optionnel)"
            value={bgImageUrl && !bgImageUrl.startsWith('data:') ? bgImageUrl : ''}
            onChange={(e) => setBgImageUrl(e.target.value || null)}
          />
        </div>

        <div className="field">
          <label className="checkbox" style={{ padding: 0 }}>
            <input type="checkbox" checked={useAccent} onChange={(e) => setUseAccent(e.target.checked)} />
            <span>Couleur d'accent personnalisée</span>
          </label>
          {useAccent && (
            <div className="inline-actions" style={{ marginTop: 'var(--space-1)' }}>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 56, padding: 2 }} />
              <input value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 120 }} />
            </div>
          )}
        </div>

        <div className="field">
          <label className="checkbox" style={{ padding: 0 }}>
            <input type="checkbox" checked={useBg} onChange={(e) => setUseBg(e.target.checked)} />
            <span>Couleur de fond personnalisée</span>
          </label>
          {useBg && (
            <div className="inline-actions" style={{ marginTop: 'var(--space-1)' }}>
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 56, padding: 2 }} />
              <input value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 120 }} />
            </div>
          )}
        </div>

        <div className="field">
          <label className="checkbox" style={{ padding: 0 }}>
            <input type="checkbox" checked={useText} onChange={(e) => setUseText(e.target.checked)} />
            <span>Couleur du texte personnalisée</span>
          </label>
          <span className="hint">Recommandé si vous choisissez un fond foncé.</span>
          {useText && (
            <div className="inline-actions" style={{ marginTop: 'var(--space-1)' }}>
              <input type="color" value={text} onChange={(e) => setText(e.target.value)} style={{ width: 56, padding: 2 }} />
              <input value={text} onChange={(e) => setText(e.target.value)} style={{ width: 120 }} />
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Enregistrement…' : "Enregistrer l'apparence"}
        </button>
      </div>

      {/* Aperçu en direct */}
      <div>
        <span className="lbl" style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-ink-faint)' }}>
          Aperçu
        </span>
        <div className="brand-preview" style={previewStyle}>
          {logoUrl && <img src={logoUrl} alt="" className="brand-logo" style={{ marginBottom: 'var(--space-3)' }} />}
          <div className="bp-eyebrow">Accréditation presse</div>
          <div className="bp-title">{eventName}</div>
          <div className="bp-field" />
          <div className="bp-field" />
          <button type="button" className="bp-btn">
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
}
