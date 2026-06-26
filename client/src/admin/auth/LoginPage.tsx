import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justReset = (location.state as { reset?: boolean } | null)?.reset === true;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible');
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
        </form>
      </div>
    </main>
  );
}
