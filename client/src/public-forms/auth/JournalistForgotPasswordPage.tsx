import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { useEventId, useEventLinks } from '../../lib/domainEvent';
import { api } from '../../lib/api';
import type { PublicEvent } from '../../lib/types';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { brandingStyle } from '../../lib/branding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * « Mot de passe oublié » journaliste : saisie de l'email → envoi d'un lien de
 * réinitialisation. Réponse toujours générique (on ne révèle pas si le compte existe).
 */
export function JournalistForgotPasswordPage() {
  const eventId = useEventId();
  const links = useEventLinks();
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
            <CardTitle className="mt-4 text-2xl">{t('forgot.title')}</CardTitle>
            <CardDescription>{t('forgot.lede')}</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {t('forgot.done')}
                </div>
                <Link to={links.login} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  {t('forgot.back')}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="jf-email">{t('login.email')}</Label>
                  <Input
                    id="jf-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy || !email}>
                  {busy ? '…' : t('forgot.submit')}
                </Button>
                <Link to={links.login} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  {t('forgot.back')}
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
