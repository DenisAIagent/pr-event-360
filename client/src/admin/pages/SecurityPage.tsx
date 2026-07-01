import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';

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
    <div className="stack">
        <PageHero
          eyebrow="Sécurité"
          title="Double authentification"
          subtitle="Ajoutez une étape de vérification à la connexion via une application d'authentification (Google Authenticator, Authy, 1Password…)."
        />

        <div className="card stack" style={{ maxWidth: 520 }}>
          {status.loading && <p className="muted">Chargement…</p>}

          {!status.loading && enabled && (
            <>
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                <ShieldCheck size={18} /> La double authentification est active.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={disable} disabled={busy} style={{ alignSelf: 'flex-start' }}>
                Désactiver
              </button>
            </>
          )}

          {!status.loading && !enabled && !qr && (
            <>
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                La double authentification n'est pas activée sur votre compte.
              </p>
              <button className="btn btn-primary" onClick={startSetup} disabled={busy} style={{ alignSelf: 'flex-start' }}>
                {busy ? 'Préparation…' : 'Activer la double authentification'}
              </button>
            </>
          )}

          {!enabled && qr && (
            <>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                1. Scannez ce QR code avec votre application d'authentification.
              </p>
              <img
                src={qr}
                alt="QR code de configuration"
                style={{ width: 188, height: 188, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-line)' }}
              />
              <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                2. Saisissez le code à 6 chiffres généré pour confirmer.
              </p>
              <div className="field" style={{ maxWidth: 200 }}>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  autoFocus
                />
              </div>
              <div className="inline-actions">
                <button className="btn btn-primary btn-sm" onClick={enable} disabled={busy || code.trim().length < 6}>
                  {busy ? 'Activation…' : 'Activer'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setQr(null); setCode(''); }} disabled={busy}>
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
    </div>
  );
}
