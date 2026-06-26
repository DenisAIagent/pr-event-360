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
          <span className="eyebrow">Back-office</span>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-1)' }}>
            PR Event <span style={{ color: 'var(--color-accent)' }}>360</span>
          </h1>
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
