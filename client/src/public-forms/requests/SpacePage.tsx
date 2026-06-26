import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import type { RequestType, SpaceResponse } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { StatusBadge } from '../../components/StatusBadge';
import { brandingStyle } from '../../lib/branding';

/**
 * Espace journaliste. En mode normal, charge les données via le token de l'URL.
 * En mode aperçu (back-office), reçoit `previewData` et désactive l'envoi.
 */
export function SpacePage({
  previewData,
  readOnly = false,
}: {
  previewData?: SpaceResponse;
  readOnly?: boolean;
} = {}) {
  const { token = '' } = useParams();
  const { t, lang, setLang } = useI18n();
  const [data, setData] = useState<SpaceResponse | null>(previewData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<RequestType>('interview');
  const [artistId, setArtistId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [stageId, setStageId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function load() {
    try {
      const res = await api.get<SpaceResponse>(`/public/space/${token}`);
      setData(res);
      if (isLang(res.journalist.lang)) setLang(res.journalist.lang);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    // Mode aperçu : on utilise les données injectées, pas d'appel réseau.
    if (previewData) {
      setData(previewData);
      if (isLang(previewData.journalist.lang)) setLang(previewData.journalist.lang);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, previewData]);

  const selectedArtist = useMemo(
    () => data?.lineup.artists.find((a) => a.id === artistId) ?? null,
    [data, artistId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return; // aperçu : aucune demande n'est envoyée
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await api.post(`/public/space/${token}/requests`, {
        type,
        artistId: type === 'interview' ? artistId || null : null,
        slotId: type === 'interview' ? slotId || null : null,
        stageId: type !== 'interview' ? stageId || null : null,
        message: message || null,
      });
      setSent(true);
      setArtistId('');
      setSlotId('');
      setStageId('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="page">
        <div className="card">{loadError}</div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <p className="muted">{t('common.loading')}</p>
      </main>
    );
  }

  const canSubmit =
    !readOnly && !submitting && (type === 'interview' ? !!artistId : !!stageId);

  return (
    <div style={brandingStyle(data.event.branding)}>
    <main className="page">
      {readOnly && (
        <div
          className="banner"
          style={{ background: 'oklch(92% 0.05 90)', color: 'oklch(38% 0.09 75)', fontWeight: 600 }}
        >
          Aperçu — c'est ce que verra un journaliste accrédité. Les demandes ne sont pas envoyées.
        </div>
      )}
      <header
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {data.event.branding.logoUrl && <img className="brand-logo" src={data.event.branding.logoUrl} alt="" />}
          <span className="eyebrow">{t('space.eyebrow')}</span>
        </div>
        <LanguageSwitcher available={data.event.languages.filter(isLang)} />
      </header>

      <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>
        {t('space.welcome', { name: data.journalist.firstName })}
      </h1>
      <p className="lede" style={{ marginBottom: 'var(--space-3)' }}>
        {t('space.lede', { event: data.event.name })}
      </p>
      <p style={{ marginBottom: 'var(--space-5)' }}>
        <a href={`/newsroom/${data.event.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          📰 Espace presse & médias à télécharger
        </a>
      </p>

      <section className="card" aria-labelledby="new-req" style={{ marginBottom: 'var(--space-5)' }}>
        <h2 id="new-req" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          {t('space.new.title')}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="banner banner-error">{error}</div>}
          {sent && <div className="banner banner-success">{t('space.sent')}</div>}

          <div className="field">
            <label>{t('space.type')}</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as RequestType);
                setSlotId('');
              }}
            >
              <option value="interview">{t('space.type.interview')}</option>
              <option value="photo_report">{t('space.type.photo_report')}</option>
              <option value="video_report">{t('space.type.video_report')}</option>
            </select>
          </div>

          {type === 'interview' ? (
            <div className="row">
              <div className="field">
                <label>
                  {t('space.artist')} <span className="req">*</span>
                </label>
                <select
                  value={artistId}
                  onChange={(e) => {
                    setArtistId(e.target.value);
                    setSlotId('');
                  }}
                  required
                >
                  <option value="">{t('space.select')}</option>
                  {data.lineup.artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>
                  {t('space.slot')} <span className="hint">({t('common.optional')})</span>
                </label>
                <select
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  disabled={!selectedArtist || selectedArtist.slots.length === 0}
                >
                  <option value="">{t('space.select')}</option>
                  {selectedArtist?.slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.day} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="field">
              <label>
                {t('space.stage')} <span className="req">*</span>
              </label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} required>
                <option value="">{t('space.select')}</option>
                {data.lineup.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label>{t('space.message')}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {submitting ? t('common.loading') : t('space.submit')}
          </button>
        </form>
      </section>

      <section aria-labelledby="my-req">
        <h2 id="my-req" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
          {t('space.requests.title')}
        </h2>
        {data.requests.length === 0 ? (
          <p className="muted">{t('space.requests.empty')}</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.requests.map((r) => (
              <li
                key={r.id}
                className="card"
                style={{ padding: 'var(--space-3) var(--space-4)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <strong>{t(`space.type.${r.type}`)}</strong>
                  <StatusBadge status={r.status} />
                </div>
                {r.message && <p className="muted" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)' }}>{r.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
    </div>
  );
}
