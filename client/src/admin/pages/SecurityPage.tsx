import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SecurityPage() {
  const api = useAuthedApi();
  const toast = useToast();
  const status = useFetch<{ enabled: boolean }>(() => api.get('/admin/auth/mfa/status'), []);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    try {
      const r = await api.post<{ qr: string; otpauth: string }>('/admin/auth/mfa/setup');
      setQr(r.qr);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de démarrer la configuration.");
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    try {
      await api.post('/admin/auth/mfa/enable', { code: code.trim() });
      toast.success('Double authentification activée.');
      setQr(null);
      setCode('');
      status.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Code incorrect, réessayez.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const c = window.prompt(
      "Pour désactiver la double authentification, saisissez un code de votre application :",
    );
    if (!c) return;
    setBusy(true);
    try {
      await api.post('/admin/auth/mfa/disable', { code: c.trim() });
      toast.success('Double authentification désactivée.');
      status.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Code incorrect.');
    } finally {
      setBusy(false);
    }
  }

  const enabled = status.data?.enabled;

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Sécurité"
        title="Double authentification"
        subtitle="Ajoutez une étape de vérification à la connexion via une application d'authentification (Google Authenticator, Authy, 1Password…)."
      />

      <Card className="max-w-[520px]">
        <CardContent className="flex flex-col gap-4 p-6">
          {status.loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!status.loading && enabled && (
            <>
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <ShieldCheck size={18} /> La double authentification est active.
              </p>
              <Button variant="ghost" size="sm" onClick={disable} disabled={busy} className="self-start">
                Désactiver
              </Button>
            </>
          )}

          {!status.loading && !enabled && !qr && (
            <>
              <p className="text-sm text-muted-foreground">
                La double authentification n'est pas activée sur votre compte.
              </p>
              <Button onClick={startSetup} disabled={busy} className="self-start">
                {busy ? 'Préparation…' : 'Activer la double authentification'}
              </Button>
            </>
          )}

          {!enabled && qr && (
            <>
              <p className="text-sm">
                1. Scannez ce QR code avec votre application d'authentification.
              </p>
              <img
                src={qr}
                alt="QR code de configuration"
                className="rounded-md border"
                style={{ width: 188, height: 188 }}
              />
              <p className="mt-2 text-sm">
                2. Saisissez le code à 6 chiffres généré pour confirmer.
              </p>
              <div className="grid max-w-[200px] gap-2">
                <Label htmlFor="mfa-code">Code de vérification</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={enable} disabled={busy || code.trim().length < 6}>
                  {busy ? 'Activation…' : 'Activer'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQr(null);
                    setCode('');
                  }}
                  disabled={busy}
                >
                  Annuler
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
