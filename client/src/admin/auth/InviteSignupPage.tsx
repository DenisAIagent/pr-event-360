import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_LENGTH = 8;

/**
 * Inscription sur INVITATION (accès offert par le super-admin, sans paiement).
 * L'invité nomme lui-même son organisation et définit son accès (mot de passe ou Google).
 */
export function InviteSignupPage() {
  const { acceptOrgInvite } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('invite') ?? '';

  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [orgName, setOrgName] = useState('');
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
      .get<{ email: string }>(`/admin/auth/org-invite?token=${encodeURIComponent(token)}`)
      .then((r) => setEmail(r.email))
      .catch(() => setInvalid(true));
  }, [token]);

  const canSubmit =
    !busy && orgName.trim() !== '' && fullName.trim() !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function accept(body: { orgName: string; fullName?: string; password?: string; googleCredential?: string }) {
    setBusy(true);
    setError(null);
    try {
      await acceptOrgInvite({ token, ...body });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible');
      setBusy(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void accept({ orgName: orgName.trim(), fullName: fullName.trim(), password });
  }

  function onGoogle(credential: string) {
    if (!orgName.trim()) {
      setError("Renseignez d'abord le nom de votre organisation.");
      return;
    }
    void accept({ orgName: orgName.trim(), googleCredential: credential });
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
          {invalid ? (
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <AlertDescription>Cette invitation est invalide ou expirée.</AlertDescription>
              </Alert>
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Vous avez été invité·e. Nommez votre organisation et définissez votre accès — c'est offert,
                aucun paiement requis.
              </p>
              <form onSubmit={submitEmail} className="flex flex-col gap-4" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="invite-org">Nom de votre organisation</Label>
                  <Input
                    id="invite-org"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex. Agence Présence / Festival X"
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-fullname">Votre nom complet</Label>
                  <Input
                    id="invite-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" value={email ?? ''} readOnly disabled />
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
                  {busy ? 'Création…' : 'Créer mon espace'}
                </Button>
              </form>
              <GoogleButton onCredential={onGoogle} text="signup_with" />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
