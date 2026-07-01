import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { useEventId, useEventLinks } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import type { PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="text-sm text-muted-foreground">{t('common.error')}</CardContent>
        </Card>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </main>
    );
  }

  return (
    <div style={brandingStyle(event.branding)}>
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {event.branding.logoUrl && <img src={event.branding.logoUrl} alt="" className="h-10" />}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('login.eyebrow')}
                </span>
              </div>
              <LanguageSwitcher available={event.languages.filter(isLang)} />
            </div>
            <CardTitle className="mt-4 text-2xl">{t('login.title')}</CardTitle>
            <CardDescription>{t('login.lede', { event: event.name })}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="jl-email">{t('login.email')}</Label>
                <Input
                  id="jl-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jl-password">{t('login.password')}</Label>
                <Input
                  id="jl-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy || !email || !password}>
                {busy ? '…' : t('login.submit')}
              </Button>
              <Link to={links.forgot} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                {t('login.forgot')}
              </Link>
              <p className="text-sm text-muted-foreground">{t('login.noPassword')}</p>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-sm">
          <Link to={links.accreditation} className="text-muted-foreground underline-offset-4 hover:underline">
            {t('login.back')}
          </Link>
        </p>
      </main>
    </div>
  );
}
