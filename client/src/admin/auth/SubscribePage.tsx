import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { ACCESS_SUBJECT, CONTACT_EMAIL, contactMailto } from '../../lib/contact';
import { GoogleButton } from './GoogleAuth';

/**
 * Inscription PAYANTE : collecte le nom de l'organisation + l'identité (email
 * ou Google), démarre un paiement Stripe Checkout et redirige vers Stripe. Le compte n'est
 * créé qu'après paiement validé (webhook). Dormant si la facturation n'est pas configurée.
 */
export function SubscribePage() {
  const [config, setConfig] = useState<{ billingEnabled: boolean; priceLabel: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
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
    email.trim() !== '';

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void goToCheckout({ orgName: orgName.trim(), fullName: fullName.trim(), email: email.trim() });
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
          {/* Le titre suit l'état réel : on ne promet pas une création immédiate
              tant que la facturation en ligne n'est pas active. */}
          <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-2)' }}>
            {config && !config.billingEnabled ? 'Demander un accès' : 'Créer votre espace'}
          </span>
        </div>

        {config && !config.billingEnabled ? (
          <>
            <div className="banner banner-info">
              L’inscription en ligne arrive bientôt. En attendant, nous ouvrons votre espace avec vous
              et paramétrons votre premier événement — réponse sous 24 h ouvrées.
            </div>
            <a className="btn btn-primary" href={contactMailto(ACCESS_SUBJECT)}>
              Demander l’ouverture de votre espace
            </a>
            {/* Adresse en clair : un `mailto:` échoue silencieusement sans client mail configuré. */}
            <p className="muted" style={{ margin: 0 }}>
              ou écrivez-nous à <strong>{CONTACT_EMAIL}</strong>
            </p>
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
                  placeholder="Ex. Agence Présence / Événement X"
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
              <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                Après paiement, un lien envoyé à cet email vous permettra de vérifier l'adresse et de définir
                votre mot de passe.
              </p>
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
