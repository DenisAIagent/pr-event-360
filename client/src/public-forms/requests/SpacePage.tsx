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
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        <Card>
          <CardContent className="pt-6">{loadError}</CardContent>
        </Card>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <p className="text-muted-foreground">{t('common.loading')}</p>
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
                <p className="m-0 text-muted-foreground">
                  {t('space.lede', { event: data.event.name })}
                </p>
              </div>

              {hasPhotoRules && data.photoRules && (
                <Card aria-labelledby="sec-photo">
                  <CardHeader>
                    <CardTitle id="sec-photo" className="text-xl">{t('space.photo.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {data.photoRules.photoRule && (
                      <div>
                        <strong>{t('space.photo.rule')}</strong>
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {data.photoRules.photoRule}
                        </p>
                      </div>
                    )}
                    {data.photoRules.onsiteContract && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {t('space.photo.contract')}
                      </div>
                    )}
                    {data.photoRules.photoTerms && (
                      <div>
                        <strong>{t('space.photo.terms')}</strong>
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {data.photoRules.photoTerms}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card aria-labelledby="new-req">
                <CardHeader>
                  <CardTitle id="new-req" className="text-xl">{t('space.new.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {sent && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {t('space.sent')}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="req-type">{t('space.type')}</Label>
                      <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
                        <SelectTrigger id="req-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interview">{t('space.type.interview')}</SelectItem>
                          <SelectItem value="photo_report">{t('space.type.photo_report')}</SelectItem>
                          <SelectItem value="video_report">{t('space.type.video_report')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="req-artist">
                        {t('space.artist')} <span className="text-destructive">*</span>
                      </Label>
                      <Select value={artistId} onValueChange={setArtistId}>
                        <SelectTrigger id="req-artist" className="w-full">
                          <SelectValue placeholder={t('space.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          {data.lineup.artists.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="req-message">{t('space.message')}</Label>
                      <Textarea id="req-message" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>

                    <Button type="submit" className="self-start" disabled={!canSubmit}>
                      {submitting ? t('common.loading') : t('space.submit')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <section aria-labelledby="my-req">
                <h2 id="my-req" className="mb-3 text-xl font-semibold">
                  {t('space.requests.title')}
                </h2>
                {data.requests.length === 0 ? (
                  <p className="text-muted-foreground">{t('space.requests.empty')}</p>
                ) : (
                  <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {data.requests.map((r) => {
                      const target = r.artistName ?? r.stageName;
                      const slot = slotText(r);
                      return (
                        <li key={r.id} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <strong>{t(`space.type.${r.type}`)}</strong>
                              {target && (
                                <span className="ml-2 text-sm text-muted-foreground">· {target}</span>
                              )}
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          {slot && (
                            <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Icon name="clock" /> {t('space.requests.slot')} : {slot}
                            </div>
                          )}
                          {r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}
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
                <h1 id="my-plan" className="text-xl font-semibold">
                  {t('space.planning.title')}
                </h1>
              </div>
              {planning.length === 0 ? (
                <p className="text-muted-foreground">{t('space.planning.empty')}</p>
              ) : (
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {planning.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm"
                    >
                      <span
                        className="whitespace-nowrap text-lg font-bold"
                        style={{ color: 'var(--p-accent, var(--brand-accent))' }}
                      >
                        {r.slotStart?.slice(0, 5)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong>{r.artistName ?? '—'}</strong>
                        <div className="text-sm text-muted-foreground">{slotText(r)}</div>
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
                className="flex items-center gap-3 rounded-xl border bg-card p-4 text-inherit no-underline shadow-sm"
                style={{ borderLeft: '3px solid var(--p-accent, var(--brand-accent))' }}
              >
                <span
                  className="grid h-[42px] w-[42px] flex-none place-items-center rounded-md"
                  style={{
                    background: 'var(--color-accent-tint, #eaf7fc)',
                    color: 'var(--p-accent, var(--brand-accent))',
                  }}
                >
                  <Icon name="newspaper" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block">{t('space.newsroom.title')}</strong>
                  <span className="text-sm text-muted-foreground">{t('space.newsroom.desc')}</span>
                </span>
                <span className={cn(buttonVariants({ size: 'sm' }), 'pointer-events-none flex-none')}>
                  {t('space.newsroom.cta')} →
                </span>
              </a>

              {readOnly ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">{t('space.password.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{t('space.password.hint')}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card aria-labelledby="sec-pwd">
                  <CardHeader>
                    <CardTitle id="sec-pwd" className="text-xl">{t('space.password.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {data.journalist.hasPassword || pwdSaved ? t('space.password.setHint') : t('space.password.hint')}
                    </p>
                    <form className="flex flex-col gap-4" onSubmit={savePassword} noValidate>
                      {pwdError && (
                        <Alert variant="destructive">
                          <AlertDescription>{pwdError}</AlertDescription>
                        </Alert>
                      )}
                      {pwdSaved && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {t('space.password.saved')}
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="sp-pwd">{t('space.password.field')}</Label>
                        <Input
                          id="sp-pwd"
                          type="password"
                          autoComplete="new-password"
                          value={pwd}
                          onChange={(e) => setPwd(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sp-pwd-confirm">{t('space.password.confirm')}</Label>
                        <Input
                          id="sp-pwd-confirm"
                          type="password"
                          autoComplete="new-password"
                          value={pwdConfirm}
                          onChange={(e) => setPwdConfirm(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="self-start" disabled={pwdBusy || !pwd || !pwdConfirm}>
                        {pwdBusy
                          ? '…'
                          : data.journalist.hasPassword
                            ? t('space.password.replace')
                            : t('space.password.save')}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
