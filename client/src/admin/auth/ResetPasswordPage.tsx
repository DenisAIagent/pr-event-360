import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_LENGTH = 8;

/** Saisie du nouveau mot de passe à partir du jeton présent dans l'URL. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    !busy && token !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/admin/auth/reset-password', { token, password });
      navigate('/admin/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <h1 className="text-xl font-semibold">Lien invalide</h1>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Le lien de réinitialisation est incomplet ou a expiré.
                </AlertDescription>
              </Alert>
              <Link
                to="/admin/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Demander un nouveau lien
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Back-office
          </span>
          <h1 className="mt-1 text-xl font-semibold">Nouveau mot de passe</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reset-password">Nouveau mot de passe</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_LENGTH}
                required
                autoFocus
              />
              {tooShort && (
                <span className="text-sm text-destructive">
                  {MIN_LENGTH} caractères minimum.
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {mismatch && (
                <span className="text-sm text-destructive">
                  Les mots de passe ne correspondent pas.
                </span>
              )}
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? 'Mise à jour…' : 'Réinitialiser'}
            </Button>
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
