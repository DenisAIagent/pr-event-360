import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Inbox, CalendarDays, Newspaper, KeyRound, ExternalLink } from 'lucide-react';
import { useI18n, isLang } from '../../i18n';
import { domainEvent } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import type { RequestType, SpaceResponse } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { StatusBadge } from '../../components/StatusBadge';
import { brandingStyle } from '../../lib/branding';
import { Icon } from '../../components/Icon';
import { CoverageSection } from './CoverageSection';

type SpaceTab = 'requests' | 'planning' | 'coverage' | 'account';

/**
 * Espace journaliste. En mode normal, charge les données via le token de l'URL.
 * En mode aperçu (back-office), reçoit `previewData` et désactive l'envoi.
 * Mise en page « app-shell » : rail sombre à gauche (navigation journaliste) + contenu,
 * même allure que le back-office des attachés de presse.
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
  const [tab, setTab] = useState<SpaceTab>('requests');

  const [type, setType] = useState<RequestType>('interview');
  const [artistId, setArtistId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaved, setPwdSaved] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return; // aperçu : aucune demande n'est envoyée
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await api.post(`/public/space/${token}/requests`, {
        type,
        artistId: artistId || null,
        slotId: null,
        stageId: null,
        message: message || null,
      });
      setSent(true);
      setArtistId('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setPwdError(null);
    setPwdSaved(false);
    if (pwd.length < 8) {
      setPwdError(t('space.password.tooShort'));
      return;
    }
    if (pwd !== pwdConfirm) {
      setPwdError(t('space.password.mismatch'));
      return;
    }
    setPwdBusy(true);
    try {
      await api.post(`/public/space/${token}/password`, { password: pwd });
      setPwdSaved(true);
      setPwd('');
      setPwdConfirm('');
      await load();
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setPwdBusy(false);
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

  const canSubmit = !readOnly && !submitting && !!artistId;

  const formatDay = (day: string) =>
    new Date(day).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const slotText = (r: { slotDay: string | null; slotStart: string | null; slotEnd: string | null }) =>
    r.slotDay && r.slotStart
      ? `${formatDay(r.slotDay)} · ${r.slotStart.slice(0, 5)}${r.slotEnd ? `–${r.slotEnd.slice(0, 5)}` : ''}`
      : null;
  // Planning personnel : interviews acceptées avec un créneau attribué, triées chronologiquement.
  const planning = data.requests
    .filter((r) => r.status === 'acceptee' && r.slotDay && r.slotStart)
    .slice()
    .sort((a, b) => `${a.slotDay}${a.slotStart}`.localeCompare(`${b.slotDay}${b.slotStart}`));

  const newsroomUrl = domainEvent ? '/newsroom' : `/newsroom/${data.event.id}`;
  const firstName = data.journalist.firstName;
  const avatarInitials = firstName.trim().slice(0, 2).toUpperCase() || '·';
  const hasPhotoRules =
    !!data.photoRules &&
    (data.photoRules.photoRule || data.photoRules.photoTerms || data.photoRules.onsiteContract);

  const NAV: { key: SpaceTab; label: string; icon: typeof Inbox }[] = [
    { key: 'requests', label: t('space.nav.requests'), icon: Inbox },
    { key: 'planning', label: t('space.nav.planning'), icon: CalendarDays },
    { key: 'coverage', label: t('space.nav.coverage'), icon: Newspaper },
    { key: 'account', label: t('space.nav.account'), icon: KeyRound },
  ];
  const activeLabel = NAV.find((n) => n.key === tab)?.label ?? '';

  return (
    <div className="jspace" style={brandingStyle(data.event.branding)}>
      <aside className="jspace-rail">
        <div className="jspace-brand">
          {data.event.branding.logoUrl ? (
            <img src={data.event.branding.logoUrl} alt={data.event.name} />
          ) : (
            <strong>{data.event.name}</strong>
          )}
        </div>
        {data.event.branding.logoUrl && <div className="jspace-event">{data.event.name}</div>}

        <nav className="jspace-nav" aria-label={t('space.eyebrow')}>
          {NAV.map(({ key, label, icon: NavIcon }) => (
            <button
              key={key}
              type="button"
              className={`jspace-nav-item${tab === key ? ' active' : ''}`}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
            >
              <NavIcon size={17} />
              {label}
            </button>
          ))}
          <a href={newsroomUrl} target="_blank" rel="noreferrer" className="jspace-nav-item">
            <Newspaper size={17} />
            {t('space.nav.newsroom')}
            <ExternalLink size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />
          </a>
        </nav>

        <div className="jspace-foot">
          <span className="jspace-ava">{avatarInitials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{firstName}</b>
            <span>{t('space.eyebrow')}</span>
          </div>
        </div>
        <div style={{ padding: '0 14px 14px' }}>
          <LanguageSwitcher available={data.event.languages.filter(isLang)} />
        </div>
      </aside>

      <main className="jspace-main">
        <header className="jspace-top">
          <span className="jspace-crumbs">
            {data.event.name} · {activeLabel}
          </span>
          {readOnly && (
            <span className="badge badge-warn" style={{ whiteSpace: 'nowrap' }}>
              {t('space.preview')}
            </span>
          )}
        </header>

        <div className="jspace-canvas">
          {tab === 'requests' && (
            <div className="stack" style={{ gap: 'var(--space-5)' }}>
              <div>
                <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>
                  {t('space.welcome', { name: firstName })}
                </h1>
                <p className="lede" style={{ margin: 0 }}>
                  {t('space.lede', { event: data.event.name })}
                </p>
              </div>

              {hasPhotoRules && data.photoRules && (
                <section className="card stack" aria-labelledby="sec-photo">
                  <h2 id="sec-photo" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
                    {t('space.photo.title')}
                  </h2>
                  {data.photoRules.photoRule && (
                    <div>
                      <strong>{t('space.photo.rule')}</strong>
                      <p className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--space-1)' }}>
                        {data.photoRules.photoRule}
                      </p>
                    </div>
                  )}
                  {data.photoRules.onsiteContract && (
                    <div className="banner banner-warn">{t('space.photo.contract')}</div>
                  )}
                  {data.photoRules.photoTerms && (
                    <div>
                      <strong>{t('space.photo.terms')}</strong>
                      <p className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--space-1)' }}>
                        {data.photoRules.photoTerms}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <section className="card" aria-labelledby="new-req">
                <h2 id="new-req" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
                  {t('space.new.title')}
                </h2>
                <form onSubmit={handleSubmit}>
                  {error && <div className="banner banner-error">{error}</div>}
                  {sent && <div className="banner banner-success">{t('space.sent')}</div>}

                  <div className="field">
                    <label>{t('space.type')}</label>
                    <select value={type} onChange={(e) => setType(e.target.value as RequestType)}>
                      <option value="interview">{t('space.type.interview')}</option>
                      <option value="photo_report">{t('space.type.photo_report')}</option>
                      <option value="video_report">{t('space.type.video_report')}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      {t('space.artist')} <span className="req">*</span>
                    </label>
                    <select value={artistId} onChange={(e) => setArtistId(e.target.value)} required>
                      <option value="">{t('space.select')}</option>
                      {data.lineup.artists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
                    {data.requests.map((r) => {
                      const target = r.artistName ?? r.stageName;
                      const slot = slotText(r);
                      return (
                        <li
                          key={r.id}
                          className="card"
                          style={{ padding: 'var(--space-3) var(--space-4)', boxShadow: 'var(--shadow-sm)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div>
                              <strong>{t(`space.type.${r.type}`)}</strong>
                              {target && (
                                <span className="muted" style={{ marginLeft: 8, fontSize: 'var(--text-sm)' }}>· {target}</span>
                              )}
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          {slot && (
                            <div
                              className="muted"
                              style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <Icon name="clock" /> {t('space.requests.slot')} : {slot}
                            </div>
                          )}
                          {r.message && <p className="muted" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)' }}>{r.message}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'planning' && (
            <section aria-labelledby="my-plan" className="stack" style={{ gap: 'var(--space-3)' }}>
              <div>
                <h1 id="my-plan" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
                  {t('space.planning.title')}
                </h1>
              </div>
              {planning.length === 0 ? (
                <p className="muted">{t('space.planning.empty')}</p>
              ) : (
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {planning.map((r) => (
                    <li
                      key={r.id}
                      className="card"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 'var(--text-lg)',
                          color: 'var(--p-accent, var(--color-accent))',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.slotStart?.slice(0, 5)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{r.artistName ?? '—'}</strong>
                        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{slotText(r)}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'coverage' && (
            <CoverageSection
              token={token}
              coverage={data.coverage ?? []}
              ended={data.event.ended ?? false}
              readOnly={readOnly}
              onChanged={load}
            />
          )}

          {tab === 'account' && (
            <div className="stack" style={{ gap: 'var(--space-5)' }}>
              <a
                href={newsroomUrl}
                target="_blank"
                rel="noreferrer"
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderLeft: '3px solid var(--p-accent, var(--color-accent))',
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-accent-tint, #eaf7fc)',
                    color: 'var(--p-accent, var(--color-accent))',
                    flex: 'none',
                  }}
                >
                  <Icon name="newspaper" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{t('space.newsroom.title')}</strong>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{t('space.newsroom.desc')}</span>
                </span>
                <span className="btn btn-primary btn-sm" style={{ flex: 'none', pointerEvents: 'none' }}>
                  {t('space.newsroom.cta')} →
                </span>
              </a>

              {readOnly ? (
                <section className="card stack">
                  <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>{t('space.password.title')}</h2>
                  <p className="muted" style={{ margin: 0 }}>{t('space.password.hint')}</p>
                </section>
              ) : (
                <section className="card stack" aria-labelledby="sec-pwd">
                  <h2 id="sec-pwd" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>{t('space.password.title')}</h2>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    {data.journalist.hasPassword || pwdSaved ? t('space.password.setHint') : t('space.password.hint')}
                  </p>
                  <form className="stack" onSubmit={savePassword} noValidate>
                    {pwdError && <div className="banner banner-error">{pwdError}</div>}
                    {pwdSaved && <div className="banner banner-success">{t('space.password.saved')}</div>}
                    <div className="field">
                      <label htmlFor="sp-pwd">{t('space.password.field')}</label>
                      <input
                        id="sp-pwd"
                        type="password"
                        autoComplete="new-password"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sp-pwd-confirm">{t('space.password.confirm')}</label>
                      <input
                        id="sp-pwd-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={pwdConfirm}
                        onChange={(e) => setPwdConfirm(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={pwdBusy || !pwd || !pwdConfirm}>
                      {pwdBusy
                        ? '…'
                        : data.journalist.hasPassword
                          ? t('space.password.replace')
                          : t('space.password.save')}
                    </button>
                  </form>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
