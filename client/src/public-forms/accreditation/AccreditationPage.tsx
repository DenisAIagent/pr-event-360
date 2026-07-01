import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { useEventId, useEventLinks } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import type { AccreditationType, PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';
import { DeadlineCountdown } from './DeadlineCountdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  publishDelayDays: 3 | 8 | 30;
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
  publishDelayDays: 8,
  commitPublish: false,
  consent: false,
};

export function AccreditationPage() {
  const eventId = useEventId();
  const links = useEventLinks();
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
        publishDelayDays: form.publishDelayDays,
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
      <main className="mx-auto max-w-2xl p-4 md:p-8">
        <Card>
          <CardContent>{t('common.notFound')}</CardContent>
        </Card>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-2xl p-4 md:p-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </main>
    );
  }

  if (event.registrationClosed || expired) {
    return (
      <div style={brandingStyle(event.branding)}>
        <main className="mx-auto max-w-2xl p-4 md:p-8">
          <Card>
            <CardContent className="flex flex-col gap-3">
              {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {event.name}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">{t('acc.closed.title')}</h1>
              <p className="text-muted-foreground">{t('acc.closed.body', { event: event.name })}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div style={brandingStyle(event.branding)}>
        <main className="mx-auto max-w-2xl p-4 md:p-8">
          <Card>
            <CardContent className="flex flex-col gap-3">
              {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {event.name}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">{t('acc.success.title')}</h1>
              <p className="text-muted-foreground">{t('acc.success.body', { name: form.firstName })}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div style={brandingStyle(event.branding)}>
    <main className="mx-auto max-w-2xl p-4 md:p-8">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {event.branding.logoUrl && <img className="brand-logo" src={event.branding.logoUrl} alt="" />}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('acc.eyebrow')}
          </span>
        </div>
        <LanguageSwitcher available={event.languages.filter(isLang)} />
      </header>

      <h1
        className="mb-2 text-3xl font-semibold tracking-tight"
        style={{ fontSize: 'var(--text-display)' }}
      >
        {event.name}
      </h1>
      <p className="mb-2 text-muted-foreground">{t('acc.lede', { event: event.name })}</p>
      <p className="mb-4 text-sm">
        <Link to={links.login} className="underline underline-offset-4">
          {t('acc.haveAccount')}
        </Link>
      </p>

      {event.deadline && (
        <DeadlineCountdown deadline={event.deadline} onExpired={() => setExpired(true)} />
      )}

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label={t('acc.firstName')} required>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  required
                />
              </Field>
              <Field id="lastName" label={t('acc.lastName')}>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label={t('acc.email')} required>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
              </Field>
              <Field id="phone" label={t('acc.phone')}>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="media" label={t('acc.media')}>
                <Input
                  id="media"
                  value={form.media}
                  onChange={(e) => update('media', e.target.value)}
                />
              </Field>
              <Field id="mediaTypeId" label={t('acc.mediaType')}>
                <Select value={form.mediaTypeId} onValueChange={(v) => update('mediaTypeId', v)}>
                  <SelectTrigger id="mediaTypeId" className="w-full">
                    <SelectValue placeholder={t('space.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {event.mediaTypes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="audience" label={t('acc.audience')}>
                <Input
                  id="audience"
                  value={form.audience}
                  onChange={(e) => update('audience', e.target.value)}
                />
              </Field>
              <Field id="accreditationType" label={t('acc.accType')}>
                <Select
                  value={form.accreditationType}
                  onValueChange={(v) => update('accreditationType', v as AccreditationType | '')}
                >
                  <SelectTrigger id="accreditationType" className="w-full">
                    <SelectValue placeholder={t('space.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presse">{t('acc.accType.presse')}</SelectItem>
                    <SelectItem value="photo">{t('acc.accType.photo')}</SelectItem>
                    <SelectItem value="video">{t('acc.accType.video')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="prevArticle" label={t('acc.prevArticle')}>
              <Input
                id="prevArticle"
                value={form.prevArticle}
                onChange={(e) => update('prevArticle', e.target.value)}
              />
            </Field>

            <Field id="publishDelayDays" label={t('acc.publishDelay')}>
              <Select
                value={String(form.publishDelayDays)}
                onValueChange={(v) => update('publishDelayDays', Number(v) as 3 | 8 | 30)}
              >
                <SelectTrigger id="publishDelayDays" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t('acc.publishDelay.3')}</SelectItem>
                  <SelectItem value="8">{t('acc.publishDelay.8')}</SelectItem>
                  <SelectItem value="30">{t('acc.publishDelay.30')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-start gap-2">
              <Checkbox
                id="commitPublish"
                checked={form.commitPublish}
                onCheckedChange={(c) => update('commitPublish', c === true)}
              />
              <Label htmlFor="commitPublish" className="font-normal leading-snug">
                {t('acc.commitPublish')}
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={form.consent}
                onCheckedChange={(c) => update('consent', c === true)}
                required
              />
              <Label htmlFor="consent" className="font-normal leading-snug">
                {t('acc.consent')} <span className="text-destructive">*</span>{' '}
                <a
                  href="/confidentialite"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {t('acc.privacy')}
                </a>
              </Label>
            </div>

            <p className="text-sm text-muted-foreground">{t('acc.coverageRule')}</p>

            <p className="text-sm text-muted-foreground">{t('acc.required')}</p>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? t('common.loading') : t('acc.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
