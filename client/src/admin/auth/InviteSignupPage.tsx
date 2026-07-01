import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleAuth';

const MIN_LENGTH = 8;

/**
 * Inscription sur INVITATION (accès offert par le super-admin, sans paiement).
 * L'invité nomme lui-même son organisation et définit son accès (mot de passe ou Google).
 */
export function InviteSignupPage() {
  const { acceptOrgInvite } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('invite') ?? '';

  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [orgName, setOrgName] = useState('');
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
      .get<{ email: string }>(`/admin/auth/org-invite?token=${encodeURIComponent(token)}`)
      .then((r) => setEmail(r.email))
      .catch(() => setInvalid(true));
  }, [token]);

  const canSubmit =
    !busy && orgName.trim() !== '' && fullName.trim() !== '' && password.length >= MIN_LENGTH && confirm === password;

  async function accept(body: { orgName: string; fullName?: string; password?: string; googleCredential?: string }) {
    setBusy(true);
    setError(null);
    try {
      await acceptOrgInvite({ token, ...body });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible');
      setBusy(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void accept({ orgName: orgName.trim(), fullName: fullName.trim(), password });
  }

  function onGoogle(credential: string) {
    if (!orgName.trim()) {
      setError("Renseignez d'abord le nom de votre organisation.");
      return;
    }
    void accept({ orgName: orgName.trim(), googleCredential: credential });
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

        {invalid ? (
          <>
            <div className="banner banner-error">Cette invitation est invalide ou expirée.</div>
            <Link to="/admin/login" className="auth-link">
              Aller à la connexion
            </Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
              Vous avez été invité·e. Nommez votre organisation et définissez votre accès — c'est offert,
              aucun paiement requis.
            </p>
            <form onSubmit={submitEmail} className="stack" noValidate>
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
                <input type="email" value={email ?? ''} readOnly disabled />
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
            </form>
            <GoogleButton onCredential={onGoogle} text="signup_with" />
          </>
        )}
      </div>
    </main>
  );
}
