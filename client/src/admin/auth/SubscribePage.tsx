import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { GoogleButton } from './GoogleAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_LENGTH = 8;

/**
 * Inscription PAYANTE : collecte le nom de l'organisation + l'identité (email/mot de passe
 * ou Google), démarre un paiement Stripe Checkout et redirige vers Stripe. Le compte n'est
 * créé qu'après paiement validé (webhook). Dormant si la facturation n'est pas configurée.
 */
export function SubscribePage() {
  const [config, setConfig] = useState<{ billingEnabled: boolean; priceLabel: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ billingEnabled: boolean; priceLabel: string }>('/admin/billing/config')
      .then(setConfig)
      .catch(() => setConfig({ billingEnabled: false, priceLabel: '' }));
  }, []);

  async function goToCheckout(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/admin/billing/checkout', body);
      window.location.href = url; // redirection vers Stripe Checkout
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Paiement impossible');
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    orgName.trim() !== '' &&
    fullName.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= MIN_LENGTH &&
    confirm === password;

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void goToCheckout({ orgName: orgName.trim(), fullName: fullName.trim(), email: email.trim(), password });
  }

  function onGoogle(credential: string) {
    if (!orgName.trim()) {
      setError("Renseignez d'abord le nom de votre organisation.");
      return;
    }
    void goToCheckout({ orgName: orgName.trim(), googleCredential: credential });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" className="h-10" />
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Créer votre espace
          </span>
        </CardHeader>
        <CardContent>
          {config && !config.billingEnabled ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                L'inscription en ligne sera bientôt disponible. Contactez-nous pour ouvrir votre espace.
              </div>
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Déjà un compte ? Se connecter
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border bg-muted/50 px-4 py-3">
                <strong className="block text-lg font-semibold">{config?.priceLabel ?? '…'}</strong>
                <span className="text-sm text-muted-foreground">
                  Abonnement annuel · accès complet à votre espace
                </span>
              </div>

              <form onSubmit={submitEmail} className="flex flex-col gap-4" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="subscribe-org">Nom de votre organisation</Label>
                  <Input
                    id="subscribe-org"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex. Agence Présence / Festival X"
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscribe-name">Votre nom complet</Label>
                  <Input
                    id="subscribe-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscribe-email">Email</Label>
                  <Input
                    id="subscribe-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscribe-password">Mot de passe</Label>
                  <Input
                    id="subscribe-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={MIN_LENGTH}
                    required
                  />
                  {password.length > 0 && password.length < MIN_LENGTH && (
                    <span className="text-sm text-destructive">{MIN_LENGTH} caractères minimum.</span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscribe-confirm">Confirmer le mot de passe</Label>
                  <Input
                    id="subscribe-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <span className="text-sm text-destructive">Les mots de passe ne correspondent pas.</span>
                  )}
                </div>
                <Button type="submit" disabled={!canSubmit}>
                  {busy ? 'Redirection…' : "S'abonner et payer"}
                </Button>
                <Link
                  to="/admin/login"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Déjà un compte ? Se connecter
                </Link>
              </form>

              <GoogleButton onCredential={onGoogle} text="signup_with" />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
