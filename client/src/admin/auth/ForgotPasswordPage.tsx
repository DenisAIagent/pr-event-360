import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

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
    <main className="login-wrap">
      <div className="card login-card stack">
        <div>
          <span className="eyebrow">Back-office</span>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-1)' }}>Mot de passe oublié</h1>
        </div>

        {done ? (
          <div className="stack">
            <div className="banner banner-success">{message}</div>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Vérifiez votre boîte mail et suivez le lien reçu (valable 1 heure).
            </p>
            <Link to="/admin/login" className="auth-link">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="stack" noValidate>
            {error && <div className="banner banner-error">{error}</div>}
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Saisissez l’email de votre compte. Si un compte existe, vous recevrez un lien de
              réinitialisation.
            </p>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !email}>
              {busy ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <Link to="/admin/login" className="auth-link">
              ← Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
