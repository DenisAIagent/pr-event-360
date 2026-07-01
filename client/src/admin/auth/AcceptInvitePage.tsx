import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_LENGTH = 8;
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  attache: 'Attaché de presse',
  assistant: 'Assistant',
};

/** Acceptation d'une invitation : le collaborateur crée son compte via le lien reçu. */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [info, setInfo] = useState<{ email: string; role: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    api
      .get<{ email: string; role: string }>(`/admin/auth/invite?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch(() => setInvalid(true));
  }, [token]);

  const canSubmit =
    !busy && fullName.trim() !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/admin/auth/accept-invite', { token, fullName, password });
      navigate('/admin/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  if (invalid) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Invitation invalide</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertDescription>
                Ce lien d’invitation est incomplet ou a expiré. Demandez un nouveau lien à un administrateur.
              </AlertDescription>
            </Alert>
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Aller à la connexion
            </Link>
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
            Invitation
          </span>
          <CardTitle className="mt-1 text-xl">
            Rejoindre PR Event <span style={{ color: 'var(--brand-accent)' }}>360</span>
          </CardTitle>
          {info && (
            <CardDescription>
              {info.email} · {ROLE_LABEL[info.role] ?? info.role}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Votre nom complet</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-password">Mot de passe</Label>
              <Input
                id="invite-password"
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
              <Label htmlFor="invite-confirm">Confirmer le mot de passe</Label>
              <Input
                id="invite-confirm"
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
              {busy ? 'Création…' : 'Créer mon compte'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
