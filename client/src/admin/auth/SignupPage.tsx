import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleAuth } from './GoogleAuth';
import { ApiError } from '../../lib/api';

const MIN_LENGTH = 8;

/**
 * Inscription self-service : crée une organisation + son compte administrateur,
 * puis connecte directement et redirige vers le tableau de bord.
 */
export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    !busy &&
    orgName.trim() !== '' &&
    fullName.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= MIN_LENGTH &&
    confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup({ orgName: orgName.trim(), fullName: fullName.trim(), email: email.trim(), password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible');
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
            Créer votre espace
          </span>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Votre organisation et son compte administrateur. Vous pourrez ensuite inviter votre équipe.
        </p>
        <form onSubmit={submit} className="stack" noValidate>
          {error && <div className="banner banner-error">{error}</div>}
          <div className="field">
            <label>Nom de votre organisation</label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex. Agence Présence / Festival X"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Votre nom complet</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_LENGTH}
              required
            />
            {password.length > 0 && password.length < MIN_LENGTH && (
              <span className="field-hint field-hint-error">{MIN_LENGTH} caractères minimum.</span>
            )}
          </div>
          <div className="field">
            <label>Confirmer le mot de passe</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {confirm.length > 0 && confirm !== password && (
              <span className="field-hint field-hint-error">Les mots de passe ne correspondent pas.</span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {busy ? 'Création…' : 'Créer mon espace'}
          </button>
          <Link to="/admin/login" className="auth-link">
            Déjà un compte ? Se connecter
          </Link>
        </form>
        <GoogleAuth />
      </div>
    </main>
  );
}
