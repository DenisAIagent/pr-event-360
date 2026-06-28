import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { api } from '../../lib/api';
import type { PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';

/**
 * « Mot de passe oublié » journaliste : saisie de l'email → envoi d'un lien de
 * réinitialisation. Réponse toujours générique (on ne révèle pas si le compte existe).
 */
export function JournalistForgotPasswordPage() {
  const { eventId = '' } = useParams();
  const { t, lang, setLang } = useI18n();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
    setBusy(true);
    try {
      await api.post('/public/journalist/forgot-password', { eventId, email });
    } catch {
      /* réponse générique : on n'expose aucune erreur */
    } finally {
      setBusy(false);
      setDone(true);
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

        <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>{t('forgot.title')}</h1>
        <p className="lede" style={{ marginBottom: 'var(--space-4)' }}>{t('forgot.lede')}</p>

        {done ? (
          <div className="card stack">
            <div className="banner banner-success">{t('forgot.done')}</div>
            <Link to={`/evenement/${eventId}/connexion`}>{t('forgot.back')}</Link>
          </div>
        ) : (
          <form className="card stack" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="jf-email">{t('login.email')}</label>
              <input
                id="jf-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !email}>
              {busy ? '…' : t('forgot.submit')}
            </button>
            <Link to={`/evenement/${eventId}/connexion`} style={{ fontSize: 'var(--text-sm)' }}>
              {t('forgot.back')}
            </Link>
          </form>
        )}
      </main>
    </div>
  );
}
