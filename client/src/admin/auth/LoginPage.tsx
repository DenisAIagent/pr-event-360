import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';
import { GoogleAuth } from './GoogleAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { login, completeMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justReset = (location.state as { reset?: boolean } | null)?.reset === true;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Étape 2 : double authentification (si activée sur le compte).
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const outcome = await login(email, password);
      if (outcome?.mfaRequired) {
        setChallenge(outcome.challenge);
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setBusy(true);
    try {
      await completeMfa(challenge, code.trim());
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" className="h-10" />
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Back-office
          </span>
        </CardHeader>
        <CardContent>
          {challenge ? (
            <form onSubmit={submitMfa} className="flex flex-col gap-4" noValidate>
              <p className="text-sm text-muted-foreground">
                Saisissez le code à 6 chiffres de votre application d'authentification.
              </p>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <div className="grid gap-2">
                <Label htmlFor="mfa-code">Code de vérification</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={busy || code.trim().length < 6}>
                {busy ? 'Vérification…' : 'Vérifier'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="self-start px-0"
                onClick={() => {
                  setChallenge(null);
                  setCode('');
                  setError(null);
                }}
              >
                ← Revenir
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                {justReset && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.
                  </div>
                )}
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy || !email || !password}>
                  {busy ? 'Connexion…' : 'Se connecter'}
                </Button>
                <div className="flex flex-col gap-1 text-sm">
                  <Link to="/admin/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
                    Mot de passe oublié ?
                  </Link>
                  <Link to="/admin/abonnement" className="text-muted-foreground underline-offset-4 hover:underline">
                    Pas encore d'espace ? S'abonner
                  </Link>
                </div>
              </form>
              <GoogleAuth />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </div>
  );
}
