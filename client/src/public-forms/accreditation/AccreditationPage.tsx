import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import type { AccreditationType, PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';
import { DeadlineCountdown } from './DeadlineCountdown';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  media: string;
  mediaTypeId: string;
  audience: string;
  prevArticle: string;
  accreditationType: AccreditationType | '';
  commitPublish: boolean;
  consent: boolean;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  media: '',
  mediaTypeId: '',
  audience: '',
  prevArticle: '',
  accreditationType: '',
  commitPublish: false,
  consent: false,
};

export function AccreditationPage() {
  const { eventId = '' } = useParams();
  const { t, lang, setLang } = useI18n();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Passe à true si le délai s'écoule pendant que la page est ouverte.
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    api
      .get<PublicEvent>(`/public/events/${eventId}`)
      .then((ev) => {
        setEvent(ev);
        // Aligne la langue de l'UI sur les langues actives de l'événement.
        if (!ev.languages.includes(lang) && ev.languages[0]) setLang(ev.languages[0]);
      })
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSubmit = form.firstName.trim() && form.email.trim() && form.consent && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/public/events/${eventId}/accreditations`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName || null,
        email: form.email.trim(),
        phone: form.phone || null,
        media: form.media || null,
        mediaTypeId: form.mediaTypeId || null,
        audience: form.audience || null,
        prevArticle: form.prevArticle || null,
        lang,
        accreditationType: form.accreditationType || null,
        commitPublish: form.commitPublish,
        consent: form.consent,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="page">
        <div className="card">{t('common.notFound')}</div>
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

  if (event.registrationClosed || expired) {
    return (
      <div style={brandingStyle(event.branding)}>
        <main className="page">
          <div className="card stack">
            {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
            <span className="eyebrow">{event.name}</span>
            <h1>{t('acc.closed.title')}</h1>
            <p className="lede">{t('acc.closed.body', { event: event.name })}</p>
          </div>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div style={brandingStyle(event.branding)}>
        <main className="page">
          <div className="card stack">
            {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
            <span className="eyebrow">{event.name}</span>
            <h1>{t('acc.success.title')}</h1>
            <p className="lede">{t('acc.success.body', { name: form.firstName })}</p>
          </div>
        </main>
      </div>
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
          <span className="eyebrow">{t('acc.eyebrow')}</span>
        </div>
        <LanguageSwitcher available={event.languages.filter(isLang)} />
      </header>

      <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>{event.name}</h1>
      <p className="lede" style={{ marginBottom: 'var(--space-4)' }}>
        {t('acc.lede', { event: event.name })}
      </p>

      {event.deadline && (
        <DeadlineCountdown deadline={event.deadline} onExpired={() => setExpired(true)} />
      )}

      <form className="card" onSubmit={handleSubmit} noValidate>
        {error && <div className="banner banner-error">{error}</div>}

        <div className="row">
          <Field label={t('acc.firstName')} required>
            <input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
          </Field>
          <Field label={t('acc.lastName')}>
            <input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </Field>
        </div>

        <div className="row">
          <Field label={t('acc.email')} required>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </Field>
          <Field label={t('acc.phone')}>
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
        </div>

        <div className="row">
          <Field label={t('acc.media')}>
            <input value={form.media} onChange={(e) => update('media', e.target.value)} />
          </Field>
          <Field label={t('acc.mediaType')}>
            <select value={form.mediaTypeId} onChange={(e) => update('mediaTypeId', e.target.value)}>
              <option value="">{t('space.select')}</option>
              {event.mediaTypes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="row">
          <Field label={t('acc.audience')}>
            <input value={form.audience} onChange={(e) => update('audience', e.target.value)} />
          </Field>
          <Field label={t('acc.accType')}>
            <select
              value={form.accreditationType}
              onChange={(e) => update('accreditationType', e.target.value as AccreditationType | '')}
            >
              <option value="">{t('space.select')}</option>
              <option value="presse">{t('acc.accType.presse')}</option>
              <option value="photo">{t('acc.accType.photo')}</option>
              <option value="video">{t('acc.accType.video')}</option>
            </select>
          </Field>
        </div>

        <Field label={t('acc.prevArticle')}>
          <input value={form.prevArticle} onChange={(e) => update('prevArticle', e.target.value)} />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={form.commitPublish} onChange={(e) => update('commitPublish', e.target.checked)} />
          <span>{t('acc.commitPublish')}</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} required />
          <span>
            {t('acc.consent')} <span className="req">*</span>{' '}
            <a href="/confidentialite" target="_blank" rel="noreferrer" className="auth-link">
              {t('acc.privacy')}
            </a>
          </span>
        </label>

        <p className="hint" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
          {t('acc.required')}
        </p>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? t('common.loading') : t('acc.submit')}
        </button>
      </form>
    </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
    </div>
  );
}
