import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

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
    <main className="login-wrap">
      <div className="card login-card stack">
        <div>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 40, display: 'block' }} />
          <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-2)' }}>
            Back-office
          </span>
        </div>
        {challenge ? (
          <form onSubmit={submitMfa} className="stack" noValidate>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Saisissez le code à 6 chiffres de votre application d'authentification.
            </p>
            {error && <div className="banner banner-error">{error}</div>}
            <div className="field">
              <label>Code de vérification</label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || code.trim().length < 6}>
              {busy ? 'Vérification…' : 'Vérifier'}
            </button>
            <button
              type="button"
              className="auth-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => {
                setChallenge(null);
                setCode('');
                setError(null);
              }}
            >
              ← Revenir
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="stack" noValidate>
            {justReset && (
              <div className="banner banner-success">
                Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.
              </div>
            )}
            {error && <div className="banner banner-error">{error}</div>}
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
            <Link to="/admin/forgot-password" className="auth-link">
              Mot de passe oublié ?
            </Link>
            <Link to="/admin/signup" className="auth-link">
              Pas encore d'espace ? Créer une organisation
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
