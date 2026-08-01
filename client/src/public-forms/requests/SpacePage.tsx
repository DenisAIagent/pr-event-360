import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Inbox, CalendarDays, Newspaper, KeyRound, ExternalLink, MapPin, Presentation, Users } from 'lucide-react';
import { useI18n, isLang, type Translate } from '../../i18n';
import { domainEvent } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import type { PublicPressConference, RequestType, SpaceResponse } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { StatusBadge } from '../../components/StatusBadge';
import { brandingStyle } from '../../lib/branding';
import { Icon } from '../../components/Icon';
import { CoverageSection } from './CoverageSection';
import { getPublicEventTerms } from '../../lib/eventProfiles';

type SpaceTab = 'requests' | 'planning' | 'conferences' | 'coverage' | 'account';

/**
 * Espace journaliste.
 * - Lien magique `/espace/:token` : échangé une fois contre un cookie JWT httpOnly
 *   (`pr360_jspace`), puis l'URL est nettoyée (`/espace`) pour ne plus exposer le bearer.
 * - Session cookie : appels API via le segment `/me` (+ CSRF double-submit).
 * - Mode aperçu back-office : `previewData` injecté, aucune mutation.
 */
export function SpacePage({
  previewData,
  readOnly = false,
}: {
  previewData?: SpaceResponse;
  readOnly?: boolean;
} = {}) {
  const { token: urlToken = '' } = useParams();
  const navigate = useNavigate();
  // Clé d'API : `me` (session cookie) après échange, ou token URL en rétrocompat / e2e.
  const [spaceKey, setSpaceKey] = useState(urlToken && urlToken !== 'me' ? urlToken : 'me');
  const { t, lang, applyLang } = useI18n();
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

  async function load(key: string = spaceKey) {
    const res = await api.get<SpaceResponse>(`/public/space/${key}`);
    setData(res);
    if (isLang(res.journalist.lang)) applyLang(res.journalist.lang);
  }

  useEffect(() => {
    // Mode aperçu : on utilise les données injectées, pas d'appel réseau.
    if (previewData) {
      setData(previewData);
      if (isLang(previewData.journalist.lang)) applyLang(previewData.journalist.lang);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (urlToken && urlToken !== 'me') {
          // Échange du lien magique → cookie session + rotation du jeton (l'URL meurt).
          await api.post('/public/space/session', { token: urlToken });
          if (cancelled) return;
          setSpaceKey('me');
          navigate('/espace', { replace: true });
          await load('me');
        } else {
          setSpaceKey('me');
          await load('me');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : t('common.error'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken, previewData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return; // aperçu : aucune demande n'est envoyée
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await api.post(`/public/space/${spaceKey}/requests`, {
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
    if (pwd.length < 12) {
      setPwdError(t('space.password.tooShort'));
      return;
    }
    if (pwd !== pwdConfirm) {
      setPwdError(t('space.password.mismatch'));
      return;
    }
    setPwdBusy(true);
    try {
      await api.post(`/public/space/${spaceKey}/password`, { password: pwd });
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

  async function downloadGdprExport() {
    try {
      const res = await fetch(`/api/public/space/${spaceKey}/export`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('common.error'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pr360-mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : t('common.error'));
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
  const eventTerms = getPublicEventTerms(data.event.eventType, lang);

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
    { key: 'conferences', label: t('space.nav.conferences'), icon: Presentation },
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
                      {eventTerms.participant} <span className="req">*</span>
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

          {tab === 'conferences' && (
            <ConferenceSection
              conferences={data.pressConferences ?? []}
              token={spaceKey}
              lang={lang}
              t={t}
              readOnly={readOnly}
              onChanged={load}
            />
          )}

          {tab === 'coverage' && (
            <CoverageSection
              token={spaceKey}
              coverage={data.coverage ?? []}
              ended={data.event.ended ?? false}
              readOnly={readOnly}
              onChanged={load}
            />
          )}

          {tab === 'account' && (
            <div className="stack" style={{ gap: 'var(--space-5)' }}>
              {!readOnly && (
                <section className="card stack" aria-labelledby="sec-badge">
                  <h2 id="sec-badge" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
                    {t('space.badge.title')}
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    {t('space.badge.hint')}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => {
                      void api
                        .get<{
                          qrDataUrl: string;
                          event: { name: string };
                          journalist: { firstName: string; lastName: string | null; media: string | null };
                        }>(`/public/space/${spaceKey}/badge`)
                        .then((badge) => {
                          const w = window.open('', '_blank', 'width=360,height=520');
                          if (!w) return;
                          const name = `${badge.journalist.firstName} ${badge.journalist.lastName ?? ''}`.trim();
                          w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${name}</title>
                            <style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px}
                            img{width:240px;height:240px} h1{font-size:18px;margin:12px 0 4px}
                            .m{color:#666;font-size:13px}</style></head><body>
                            <div class="m">${badge.event.name}</div>
                            <h1>${name}</h1>
                            <div class="m">${badge.journalist.media ?? ''}</div>
                            <img src="${badge.qrDataUrl}" alt="QR"/>
                            <p class="m">${t('space.badge.printHint')}</p>
                            <script>window.onload=function(){window.print()}</script>
                            </body></html>`);
                          w.document.close();
                        })
                        .catch((err: unknown) => {
                          setPwdError(err instanceof Error ? err.message : t('common.error'));
                        });
                    }}
                  >
                    {t('space.badge.show')}
                  </button>
                </section>
              )}
              {!readOnly && (
                <section className="card stack" aria-labelledby="sec-gdpr">
                  <h2 id="sec-gdpr" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
                    {t('space.gdpr.title')}
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    {t('space.gdpr.hint')}
                  </p>
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => void downloadGdprExport()}>
                    {t('space.gdpr.download')}
                  </button>
                </section>
              )}
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
              ) : data.journalist.hasPassword && !pwdSaved ? (
                // Mot de passe déjà défini : plus de remplacement via le seul lien magique
                // (anti-détournement d'un lien fuité). Le changement passe par le reset email.
                <section className="card stack" aria-labelledby="sec-pwd">
                  <h2 id="sec-pwd" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>{t('space.password.title')}</h2>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{t('space.password.setHint')}</p>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{t('space.password.changeHint')}</p>
                  <a
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    href={domainEvent ? '/mot-de-passe-oublie' : `/evenement/${data.event.id}/mot-de-passe-oublie`}
                  >
                    {t('space.password.forgotLink')}
                  </a>
                </section>
              ) : (
                <section className="card stack" aria-labelledby="sec-pwd">
                  <h2 id="sec-pwd" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>{t('space.password.title')}</h2>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    {pwdSaved ? t('space.password.setHint') : t('space.password.hint')}
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

function ConferenceSection({ conferences, token, lang, t, readOnly, onChanged }: {
  conferences: PublicPressConference[];
  token: string;
  lang: string;
  t: Translate;
  readOnly: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function register(conferenceId: string) {
    if (readOnly) return;
    setBusyId(conferenceId);
    setActionError(null);
    try {
      await api.post(`/public/space/${token}/press-conferences/${conferenceId}/register`);
      await onChanged();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(conferenceId: string) {
    if (readOnly) return;
    setBusyId(conferenceId);
    setActionError(null);
    try {
      await api.del(`/public/space/${token}/press-conferences/${conferenceId}/registration`);
      await onChanged();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }

  const formatDate = (value: string) => new Date(value).toLocaleString(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="stack" aria-labelledby="press-conferences-title" style={{ gap: 'var(--space-3)' }}>
      <div>
        <h1 id="press-conferences-title" style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
          {t('space.conference.title')}
        </h1>
        <p className="muted" style={{ margin: 'var(--space-1) 0 0' }}>{t('space.conference.lede')}</p>
      </div>
      {actionError && <div className="banner banner-error">{actionError}</div>}
      {conferences.length === 0 ? <p className="muted">{t('space.conference.empty')}</p> : conferences.map((conference) => {
        const status = conference.registrationStatus;
        const canRegister = conference.status === 'published' && conference.eligible && Date.parse(conference.startsAt) > Date.now();
        const activeRegistration = status === 'invited' || status === 'pending' || status === 'registered'
          || status === 'waitlisted' || status === 'checked_in';
        const canRetry = status == null || status === 'cancelled'
          || (status === 'declined' && conference.registrationMode !== 'invite_only');
        const actionLabel = conference.registrationMode === 'approval'
          ? t('space.conference.request')
          : conference.available === 0
            ? t('space.conference.joinWaitlist')
            : t('space.conference.register');
        return (
          <article key={conference.id} className="card stack" style={{ gap: 'var(--space-3)' }}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{conference.title}</h2>
                <div className="muted" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CalendarDays size={15} /> {formatDate(conference.startsAt)}
                  </span>
                </div>
              </div>
              {status && (
                <span className={`badge ${status === 'registered' || status === 'checked_in' ? 'badge-success' : status === 'waitlisted' || status === 'pending' ? 'badge-pending' : ''}`}>
                  {t(`space.conference.status.${status}`)}
                </span>
              )}
            </div>
            {conference.description && <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{conference.description}</p>}
            <div className="inline-actions muted" style={{ fontSize: 'var(--text-sm)', gap: 'var(--space-4)' }}>
              {conference.venue && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={15} /> {conference.venue}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Users size={15} /> {conference.available == null
                  ? t('space.conference.unlimited')
                  : conference.available > 0
                    ? t('space.conference.available', { count: String(conference.available) })
                    : t('space.conference.full')}
              </span>
            </div>
            {conference.participants.length > 0 && (
              <div className="filters" style={{ marginBottom: 0 }}>
                {conference.participants.map((participant) => <span className="chip" key={participant.id}>{participant.name}</span>)}
              </div>
            )}
            {conference.embargoUntil && (
              <div className="banner banner-warn">{t('space.conference.embargo', { date: formatDate(conference.embargoUntil) })}</div>
            )}
            {conference.status !== 'published' && (
              <p className="muted" style={{ margin: 0 }}>{t(`space.conference.${conference.status}`)}</p>
            )}
            {!conference.eligible && <p className="muted" style={{ margin: 0 }}>{t('space.conference.notEligible')}</p>}
            {canRegister && status === 'invited' && (
              <div className="inline-actions">
                <button className="btn btn-primary" disabled={busyId === conference.id} onClick={() => void register(conference.id)}>
                  {t('space.conference.confirmInvitation')}
                </button>
                <button className="btn btn-ghost" disabled={busyId === conference.id} onClick={() => void cancel(conference.id)}>
                  {t('space.conference.declineInvitation')}
                </button>
              </div>
            )}
            {canRegister && canRetry && (
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busyId === conference.id}
                onClick={() => void register(conference.id)}>{actionLabel}</button>
            )}
            {activeRegistration && status !== 'invited' && status !== 'checked_in' && conference.status === 'published' && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busyId === conference.id}
                onClick={() => void cancel(conference.id)}>{t('space.conference.cancel')}</button>
            )}
            {conference.livestreamUrl && (status === 'registered' || status === 'checked_in') && (
              <a className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} href={conference.livestreamUrl} target="_blank" rel="noreferrer">
                {t('space.conference.livestream')} <ExternalLink size={14} />
              </a>
            )}
          </article>
        );
      })}
    </section>
  );
}
