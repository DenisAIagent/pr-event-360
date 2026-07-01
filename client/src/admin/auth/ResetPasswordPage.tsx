import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

const MIN_LENGTH = 8;

/** Saisie du nouveau mot de passe à partir du jeton présent dans l'URL. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    !busy && token !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/admin/auth/reset-password', { token, password });
      navigate('/admin/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="login-wrap">
        <div className="card login-card stack">
          <h1 style={{ fontSize: 'var(--text-xl)' }}>Lien invalide</h1>
          <div className="banner banner-error">
            Le lien de réinitialisation est incomplet ou a expiré.
          </div>
          <Link to="/admin/forgot-password" className="auth-link">
            Demander un nouveau lien
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <div>
          <span className="eyebrow">Back-office</span>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-1)' }}>
            Nouveau mot de passe
          </h1>
        </div>
        <form onSubmit={submit} className="stack" noValidate>
          {error && <div className="banner banner-error">{error}</div>}
          <div className="field">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_LENGTH}
              required
              autoFocus
            />
            {tooShort && (
              <span className="field-hint field-hint-error">
                {MIN_LENGTH} caractères minimum.
              </span>
            )}
          </div>
          <div className="field">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {mismatch && (
              <span className="field-hint field-hint-error">
                Les mots de passe ne correspondent pas.
              </span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {busy ? 'Mise à jour…' : 'Réinitialiser'}
          </button>
          <Link to="/admin/login" className="auth-link">
            ← Retour à la connexion
          </Link>
        </form>
      </div>
    </main>
  );
}
