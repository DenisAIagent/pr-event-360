import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Demande de réinitialisation : l'API répond toujours de façon générique. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>('/admin/auth/forgot-password', { email });
      setDone(true);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Back-office
          </span>
          <h1 className="mt-1 text-xl font-semibold">Mot de passe oublié</h1>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
              <p className="text-sm text-muted-foreground">
                Vérifiez votre boîte mail et suivez le lien reçu (valable 1 heure).
              </p>
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Saisissez l’email de votre compte. Si un compte existe, vous recevrez un lien de
                réinitialisation.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={busy || !email}>
                {busy ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                ← Retour à la connexion
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
