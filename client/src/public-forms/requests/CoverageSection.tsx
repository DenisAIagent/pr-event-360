import { useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { uploadToCloudinary } from '../../admin/lib/upload';
import type { UploadSignature } from '../../admin/lib/types';
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABEL, type PressCoverageItem } from '../../lib/mediaCategories';

/**
 * Revue de presse — le journaliste dépose ses retombées (liens ou médias uploadés).
 * Pour tout média uploadé (photo/vidéo/capture), l'autorisation d'archivage + usage
 * promotionnel est obligatoire (double consentement horodaté).
 */
export function CoverageSection({
  token,
  coverage,
  ended,
  readOnly,
  onChanged,
}: {
  token: string;
  coverage: PressCoverageItem[];
  ended: boolean;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [mediaCategory, setMediaCategory] = useState<string>('web');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [archive, setArchive] = useState(false);
  const [promo, setPromo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setUrl('');
    setThumbnailUrl(null);
    setTitle('');
    setArchive(false);
    setPromo(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onUpload(file: File) {
    setErr(null);
    setUploadBusy(true);
    try {
      const sig = await api.post<UploadSignature>(`/public/space/${token}/assets/sign`);
      const up = await uploadToCloudinary(file, sig);
      setUrl(up.url);
      setThumbnailUrl(up.thumbnailUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec de l’upload');
    } finally {
      setUploadBusy(false);
    }
  }

  async function submit() {
    setErr(null);
    if (!url) return setErr(mode === 'link' ? 'Collez un lien.' : 'Ajoutez un fichier.');
    if (mode === 'upload' && (!archive || !promo)) {
      return setErr('Pour un média, cochez les deux autorisations (archivage + promotion).');
    }
    setBusy(true);
    try {
      await api.post(`/public/space/${token}/coverage`, {
        mediaCategory,
        isUpload: mode === 'upload',
        url,
        thumbnailUrl,
        title: title.trim() || null,
        archiveConsent: mode === 'upload' ? archive : false,
        promoConsent: mode === 'upload' ? promo : false,
      });
      reset();
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/public/space/${token}/coverage/${id}`).catch(() => {});
    onChanged();
  }

  return (
    <section className="card stack" aria-labelledby="sec-coverage" style={{ marginBottom: 'var(--space-5)' }}>
      <div>
        <h2 id="sec-coverage" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Vos retombées presse</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {ended
            ? 'L’événement est terminé — partagez vos publications (articles, réseaux, vidéos) et vos photos pour la revue de presse.'
            : 'Vous pourrez déposer ici vos publications et photos après l’événement.'}
        </p>
      </div>

      {coverage.length > 0 && (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {coverage.map((c) => (
            <li key={c.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {c.isUpload && c.thumbnailUrl && (
                <img src={c.thumbnailUrl} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="badge" style={{ marginRight: 6 }}>{MEDIA_CATEGORY_LABEL[c.mediaCategory] ?? c.mediaCategory}</span>
                <a href={c.url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                  {c.title || c.url}
                </a>
              </div>
              {!readOnly && (
                <button className="btn btn-ghost btn-sm" onClick={() => remove(c.id)} aria-label="Retirer">Retirer</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="stack" style={{ borderTop: '1px solid var(--color-line, #e3e3e3)', paddingTop: 'var(--space-3)' }}>
          {err && <div className="banner banner-error">{err}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" aria-pressed={mode === 'link'} onClick={() => { setMode('link'); reset(); }} style={{ fontWeight: mode === 'link' ? 700 : 400 }}>
              Un lien (article, réseau, YouTube…)
            </button>
            <button className="btn btn-sm" aria-pressed={mode === 'upload'} onClick={() => { setMode('upload'); reset(); }} style={{ fontWeight: mode === 'upload' ? 700 : 400 }}>
              Une photo / capture (fichier)
            </button>
          </div>

          <div className="field">
            <label>Catégorie de média</label>
            <select value={mediaCategory} onChange={(e) => setMediaCategory(e.target.value)}>
              {MEDIA_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {mode === 'link' ? (
            <div className="field">
              <label>Lien (https)</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          ) : (
            <div className="field">
              <label>Fichier (photo ou capture d’écran)</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {thumbnailUrl && <img src={thumbnailUrl} alt="" style={{ height: 48, width: 64, objectFit: 'cover', borderRadius: 6 }} />}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                  }}
                />
                {uploadBusy && <span className="muted">Upload…</span>}
              </div>
            </div>
          )}

          <div className="field">
            <label>Titre / description (optionnel)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ex. Article Rock&Folk, reportage TF1…" />
          </div>

          {mode === 'upload' && (
            <div className="stack" style={{ gap: 6 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={archive} onChange={(e) => setArchive(e.target.checked)} />
                <span>J’autorise l’organisateur à <strong>conserver ce média dans ses archives</strong>.</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} />
                <span>J’autorise son <strong>utilisation à des fins de promotion</strong> de l’événement.</span>
              </label>
            </div>
          )}

          <button className="btn btn-primary" onClick={submit} disabled={busy || uploadBusy} style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Ajout…' : 'Ajouter à la revue de presse'}
          </button>
        </div>
      )}
    </section>
  );
}
