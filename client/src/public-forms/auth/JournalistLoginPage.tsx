import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { useEventId, useEventLinks } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import type { PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';

/**
 * Connexion du journaliste à son espace par email + mot de passe (compte par
 * événement). En cas de succès, le serveur renvoie le token d'espace et l'on
 * redirige vers /espace/:token. Le lien magique reste une alternative valable.
 */
export function JournalistLoginPage() {
  const eventId = useEventId();
  const links = useEventLinks();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<PublicEvent>(`/public/events/${eventId}`)
      .then((ev) => {
        setEvent(ev);
        if (!ev.languages.includes(lang) && ev.languages[0]) setLang(ev.languages[0]);
      })
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.post<{ token: string; firstName: string }>('/public/journalist/login', {
        eventId,
        email,
        password,
      });
      navigate(`/espace/${token}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.error'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="page">
        <div className="card">{t('common.error')}</div>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="page">
        <p className="muted">{t('common.loading')}</p>
      </main>
    );
  }

  return (
    <div style={brandingStyle(event.branding)}>
      <main className="page">
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
            <span className="eyebrow">{t('login.eyebrow')}</span>
          </div>
          <LanguageSwitcher available={event.languages.filter(isLang)} />
        </header>

        <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>{t('login.title')}</h1>
        <p className="lede" style={{ marginBottom: 'var(--space-4)' }}>
          {t('login.lede', { event: event.name })}
        </p>

        <form className="card stack" onSubmit={submit} noValidate>
          {error && <div className="banner banner-error">{error}</div>}
          <div className="field">
            <label htmlFor="jl-email">{t('login.email')}</label>
            <input
              id="jl-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="jl-password">{t('login.password')}</label>
            <input
              id="jl-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>
            {busy ? '…' : t('login.submit')}
          </button>
          <Link to={links.forgot} style={{ fontSize: 'var(--text-sm)' }}>
            {t('login.forgot')}
          </Link>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
            {t('login.noPassword')}
          </p>
        </form>

        <p style={{ marginTop: 'var(--space-4)' }}>
          <Link to={links.accreditation}>{t('login.back')}</Link>
        </p>
      </main>
    </div>
  );
}
