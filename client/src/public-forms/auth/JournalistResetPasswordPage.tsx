import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
 * Réinitialisation du mot de passe journaliste via le jeton reçu par email.
 * Choisit un nouveau mot de passe → redirige vers la page de connexion.
 */
export function JournalistResetPasswordPage() {
  const eventId = useEventId();
  const links = useEventLinks();
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
      navigate(links.login, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={event ? brandingStyle(event.branding) : undefined}>
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {event?.branding.logoUrl && <img src={event.branding.logoUrl} alt="" className="h-10" />}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('login.eyebrow')}
                </span>
              </div>
              {event && <LanguageSwitcher available={event.languages.filter(isLang)} />}
            </div>
            <CardTitle className="mt-4 text-2xl">{t('reset.title')}</CardTitle>
            <CardDescription>{t('reset.lede')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertDescription>{t('reset.noToken')}</AlertDescription>
                </Alert>
                <Link to={links.forgot} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  {t('reset.requestAgain')}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="jr-pwd">{t('space.password.field')}</Label>
                  <Input
                    id="jr-pwd"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jr-confirm">{t('space.password.confirm')}</Label>
                  <Input
                    id="jr-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy || !password || !confirm}>
                  {busy ? '…' : t('reset.submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
