import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

/**
 * Écran d'enrôlement MFA OBLIGATOIRE. Affiché à la place de l'application quand le
 * compte (admin ou super-admin) n'a pas encore activé la double authentification :
 * le serveur bloque toute autre action tant qu'elle n'est pas configurée.
 */
export function MfaEnrollmentGate() {
  const { onMfaEnabled, logout } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ qr: string; otpauth: string }>('/admin/auth/mfa/setup');
      setQr(r.qr);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de démarrer la configuration.');
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/auth/mfa/enable', { code: code.trim() });
      onMfaEnabled();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Code incorrect, réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 'var(--space-4)' }}>
      <div className="card stack" style={{ maxWidth: 480, width: '100%' }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <ShieldCheck size={20} /> Double authentification obligatoire
        </p>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Pour la sécurité de votre organisation, les comptes administrateurs doivent activer la
          double authentification avant d'accéder au back-office.
        </p>
        {error && <div className="banner banner-error">{error}</div>}

        {!qr ? (
          <button className="btn btn-primary" onClick={startSetup} disabled={busy} style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Préparation…' : 'Activer la double authentification'}
          </button>
        ) : (
          <>
            <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
              1. Scannez ce QR code avec votre application (Google Authenticator, Authy, 1Password…).
            </p>
            <img
              src={qr}
              alt="QR code de configuration"
              style={{ width: 188, height: 188, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-line)' }}
            />
            <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>2. Saisissez le code à 6 chiffres généré.</p>
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
                {busy ? 'Activation…' : 'Activer et continuer'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setQr(null); setCode(''); }} disabled={busy}>
                Recommencer
              </button>
            </div>
          </>
        )}

        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ alignSelf: 'flex-start' }}>
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
