import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

const MIN_LENGTH = 8;
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  attache: 'Attaché de presse',
  assistant: 'Assistant',
};

/** Acceptation d'une invitation : le collaborateur crée son compte via le lien reçu. */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [info, setInfo] = useState<{ email: string; role: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
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
      .get<{ email: string; role: string }>(`/admin/auth/invite?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch(() => setInvalid(true));
  }, [token]);

  const canSubmit =
    !busy && fullName.trim() !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/admin/auth/accept-invite', { token, fullName, password });
      navigate('/admin/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  if (invalid) {
    return (
      <main className="login-wrap">
        <div className="card login-card stack">
          <h1 style={{ fontSize: 'var(--text-xl)' }}>Invitation invalide</h1>
          <div className="banner banner-error">
            Ce lien d’invitation est incomplet ou a expiré. Demandez un nouveau lien à un administrateur.
          </div>
          <Link to="/admin/login" className="auth-link">
            ← Aller à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <div>
          <span className="eyebrow">Invitation</span>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-1)' }}>
            Rejoindre PR Event <span style={{ color: 'var(--color-accent)' }}>360</span>
          </h1>
          {info && (
            <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
              {info.email} · {ROLE_LABEL[info.role] ?? info.role}
            </p>
          )}
        </div>
        <form onSubmit={submit} className="stack" noValidate>
          {error && <div className="banner banner-error">{error}</div>}
          <div className="field">
            <label>Votre nom complet</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
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
            {busy ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </main>
  );
}
