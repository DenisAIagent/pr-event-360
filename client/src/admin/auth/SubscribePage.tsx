import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { GoogleButton } from './GoogleAuth';

const MIN_LENGTH = 8;

/**
 * Inscription PAYANTE : collecte le nom de l'organisation + l'identité (email/mot de passe
 * ou Google), démarre un paiement Stripe Checkout et redirige vers Stripe. Le compte n'est
 * créé qu'après paiement validé (webhook). Dormant si la facturation n'est pas configurée.
 */
export function SubscribePage() {
  const [config, setConfig] = useState<{ billingEnabled: boolean; priceLabel: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ billingEnabled: boolean; priceLabel: string }>('/admin/billing/config')
      .then(setConfig)
      .catch(() => setConfig({ billingEnabled: false, priceLabel: '' }));
  }, []);

  async function goToCheckout(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/admin/billing/checkout', body);
      window.location.href = url; // redirection vers Stripe Checkout
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Paiement impossible');
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    orgName.trim() !== '' &&
    fullName.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= MIN_LENGTH &&
    confirm === password;

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void goToCheckout({ orgName: orgName.trim(), fullName: fullName.trim(), email: email.trim(), password });
  }

  function onGoogle(credential: string) {
    if (!orgName.trim()) {
      setError("Renseignez d'abord le nom de votre organisation.");
      return;
    }
    void goToCheckout({ orgName: orgName.trim(), googleCredential: credential });
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

        {config && !config.billingEnabled ? (
          <>
            <div className="banner banner-info">
              L'inscription en ligne sera bientôt disponible. Contactez-nous pour ouvrir votre espace.
            </div>
            <Link to="/admin/login" className="auth-link">
              Déjà un compte ? Se connecter
            </Link>
          </>
        ) : (
          <>
            <div className="price-badge">
              <strong>{config?.priceLabel ?? '…'}</strong>
              <span>Abonnement annuel · accès complet à votre espace</span>
            </div>

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
                {busy ? 'Redirection…' : "S'abonner et payer"}
              </button>
              <Link to="/admin/login" className="auth-link">
                Déjà un compte ? Se connecter
              </Link>
            </form>

            <GoogleButton onCredential={onGoogle} text="signup_with" />
          </>
        )}
      </div>
    </main>
  );
}
