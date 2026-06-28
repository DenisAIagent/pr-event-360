import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import type { PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';

/**
 * Réinitialisation du mot de passe journaliste via le jeton reçu par email.
 * Choisit un nouveau mot de passe → redirige vers la page de connexion.
 */
export function JournalistResetPasswordPage() {
  const { eventId = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<PublicEvent>(`/public/events/${eventId}`)
      .then((ev) => {
        setEvent(ev);
        if (!ev.languages.includes(lang) && ev.languages[0]) setLang(ev.languages[0]);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('space.password.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('space.password.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/public/journalist/reset-password', { token, password });
      navigate(`/evenement/${eventId}/connexion`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={event ? brandingStyle(event.branding) : undefined}>
      <main className="page">
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {event?.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
            <span className="eyebrow">{t('login.eyebrow')}</span>
          </div>
          {event && <LanguageSwitcher available={event.languages.filter(isLang)} />}
        </header>

        <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>{t('reset.title')}</h1>
        <p className="lede" style={{ marginBottom: 'var(--space-4)' }}>{t('reset.lede')}</p>

        {!token ? (
          <div className="card">
            <div className="banner banner-error">{t('reset.noToken')}</div>
            <p style={{ marginTop: 'var(--space-3)' }}>
              <Link to={`/evenement/${eventId}/mot-de-passe-oublie`}>{t('reset.requestAgain')}</Link>
            </p>
          </div>
        ) : (
          <form className="card stack" onSubmit={submit} noValidate>
            {error && <div className="banner banner-error">{error}</div>}
            <div className="field">
              <label htmlFor="jr-pwd">{t('space.password.field')}</label>
              <input
                id="jr-pwd"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="jr-confirm">{t('space.password.confirm')}</label>
              <input
                id="jr-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !password || !confirm}>
              {busy ? '…' : t('reset.submit')}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
