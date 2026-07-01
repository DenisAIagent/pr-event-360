import { useRef, useState, type CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Newspaper, Globe, Tv, Radio, Share2, PlayCircle, Mic, Image as ImageIcon, Video, Link2,
  Plus, Link as LinkIcon, Camera, X, ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import { uploadToCloudinary } from '../../admin/lib/upload';
import type { UploadSignature } from '../../admin/lib/types';
import { MEDIA_CATEGORIES, type PressCoverageItem } from '../../lib/mediaCategories';

const CAT_META: Record<string, { icon: LucideIcon; color: string }> = {
  presse_ecrite: { icon: Newspaper, color: '#6366f1' },
  web: { icon: Globe, color: '#0ea5e9' },
  tv: { icon: Tv, color: '#ef4444' },
  radio: { icon: Radio, color: '#f59e0b' },
  reseaux_sociaux: { icon: Share2, color: '#ec4899' },
  youtube: { icon: PlayCircle, color: '#dc2626' },
  podcast: { icon: Mic, color: '#8b5cf6' },
  photo: { icon: ImageIcon, color: '#10b981' },
  video: { icon: Video, color: '#14b8a6' },
  autre: { icon: Link2, color: '#64748b' },
};
const metaOf = (v: string) => CAT_META[v] ?? CAT_META.autre!;

/**
 * Revue de presse — le journaliste dépose ses retombées (liens ou médias uploadés).
 * Pour tout média uploadé, l'autorisation d'archivage + usage promotionnel est obligatoire.
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
  const { t } = useI18n();
  const catLabel = (v: string) => t(`space.coverage.cat.${v}`);
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
      setErr(e instanceof Error ? e.message : t('space.coverage.errUpload'));
    } finally {
      setUploadBusy(false);
    }
  }

  async function submit() {
    setErr(null);
    if (!url) return setErr(mode === 'link' ? t('space.coverage.errLink') : t('space.coverage.errFile'));
    if (mode === 'upload' && (!archive || !promo)) return setErr(t('space.coverage.errConsent'));
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
      setErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/public/space/${token}/coverage/${id}`).catch(() => {});
    onChanged();
  }

  const tile = (color: string): CSSProperties => ({
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    background: `${color}1a`,
    color,
  });
  const segBtn = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '9px 12px',
    borderRadius: 9,
    border: '1px solid var(--color-line, #e3e3e3)',
    background: active ? 'var(--color-accent, #1598d3)' : '#fff',
    color: active ? '#fff' : 'inherit',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  });

  return (
    <section className="card stack" aria-labelledby="sec-coverage" style={{ marginBottom: 'var(--space-5)' }}>
      <div>
        <h2 id="sec-coverage" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>{t('space.coverage.title')}</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {ended ? t('space.coverage.ledeEnded') : t('space.coverage.ledeUpcoming')}
        </p>
      </div>

      {coverage.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          {coverage.map((c) => {
            const m = metaOf(c.mediaCategory);
            const Ic = m.icon;
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  border: '1px solid var(--color-line, #e3e3e3)',
                  borderRadius: 12,
                }}
              >
                {c.isUpload && c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt="" style={{ ...tile(m.color), width: 56, height: 44, objectFit: 'cover' }} />
                ) : (
                  <span style={tile(m.color)}><Ic size={20} /></span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {c.title || c.url} <ExternalLink size={12} />
                  </a>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft, #667)' }}>{catLabel(c.mediaCategory)}</div>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => remove(c.id)}
                    aria-label={t('space.coverage.remove')}
                    title={t('space.coverage.remove')}
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#d4183d', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <div className="stack" style={{ borderTop: '1px solid var(--color-line, #e3e3e3)', paddingTop: 'var(--space-3)', gap: 'var(--space-3)' }}>
          {err && <div className="banner banner-error">{err}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setMode('link'); reset(); }} style={segBtn(mode === 'link')}>
              <LinkIcon size={15} /> {t('space.coverage.modeLink')}
            </button>
            <button type="button" onClick={() => { setMode('upload'); reset(); }} style={segBtn(mode === 'upload')}>
              <Camera size={15} /> {t('space.coverage.modeUpload')}
            </button>
          </div>

          <div className="field">
            <label>{t('space.coverage.category')}</label>
            <select value={mediaCategory} onChange={(e) => setMediaCategory(e.target.value)}>
              {MEDIA_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{catLabel(c.value)}</option>
              ))}
            </select>
          </div>

          {mode === 'link' ? (
            <div className="field">
              <label>{t('space.coverage.linkLabel')}</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          ) : (
            <div className="field">
              <label>{t('space.coverage.fileLabel')}</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {thumbnailUrl && <img src={thumbnailUrl} alt="" style={{ height: 48, width: 64, objectFit: 'cover', borderRadius: 8 }} />}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                  }}
                />
                {uploadBusy && <span className="muted">{t('space.coverage.uploading')}</span>}
              </div>
            </div>
          )}

          <div className="field">
            <label>{t('space.coverage.titleLabel')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={t('space.coverage.titlePlaceholder')} />
          </div>

          {mode === 'upload' && (
            <div
              className="stack"
              style={{ gap: 8, background: 'var(--color-accent-tint, #f0f7fc)', borderRadius: 10, padding: 'var(--space-3)' }}
            >
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={archive} onChange={(e) => setArchive(e.target.checked)} />
                <span>{t('space.coverage.consentArchive')}</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} />
                <span>{t('space.coverage.consentPromo')}</span>
              </label>
            </div>
          )}

          <button className="btn btn-primary" onClick={submit} disabled={busy || uploadBusy} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> {busy ? t('space.coverage.adding') : t('space.coverage.add')}
          </button>
        </div>
      )}
    </section>
  );
}
