import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { ACCESS_SUBJECT, CONTACT_EMAIL, contactMailto } from '../../lib/contact';
import { GoogleButton } from './GoogleAuth';

interface OfferDto {
  id: string;
  name: string;
  tagline: string;
  priceHt: number | null;
  priceLabel: string;
  features: string[];
  notes?: string[];
  launchOffer: boolean;
  highlighted?: boolean;
  checkoutAvailable: boolean;
  checkoutMode: string;
  eventCredits: number | null;
}

interface BillingConfig {
  billingEnabled: boolean;
  priceLabel: string;
  positioning: string;
  offers: OfferDto[];
  googleDrive: { name: string; priceLabel: string; features: string[] };
}

const SIGNUP_PLANS = new Set(['event', 'pack3', 'agency']);

/**
 * Inscription commerciale multi-offre : Événement, Pack 3, Agence.
 * Si Stripe n'est pas configuré → demande d'accès (mailto).
 */
export function SubscribePage() {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [planId, setPlanId] = useState('pack3');
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<BillingConfig>('/admin/billing/config')
      .then((c) => {
        setConfig(c);
        const preferred = c.offers.find((o) => o.id === 'pack3' && o.launchOffer) ?? c.offers.find((o) => o.launchOffer);
        if (preferred) setPlanId(preferred.id);
      })
      .catch(() =>
        setConfig({
          billingEnabled: false,
          priceLabel: '',
          positioning: '',
          offers: [],
          googleDrive: { name: 'Google Drive', priceLabel: 'Inclus', features: [] },
        }),
      );
  }, []);

  const launchOffers = (config?.offers ?? []).filter((o) => SIGNUP_PLANS.has(o.id) && o.launchOffer);
  const selected = launchOffers.find((o) => o.id === planId) ?? launchOffers[0];

  async function goToCheckout(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/admin/billing/checkout', {
        planId: selected?.id ?? 'event',
        ...body,
      });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Paiement impossible');
      setBusy(false);
    }
  }

  const canSubmit =
    !busy && orgName.trim() !== '' && fullName.trim() !== '' && email.trim() !== '' && !!selected;

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

  const billingOff = config && !config.billingEnabled;

  return (
    <main className="login-wrap" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <div className="card login-card stack" style={{ maxWidth: '100%' }}>
          <div>
            <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 40, display: 'block' }} />
            <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-2)' }}>
              {billingOff ? 'Demander un accès' : 'Choisir votre offre'}
            </span>
          </div>

          {billingOff ? (
            <>
              <div className="banner banner-info">
                L’inscription en ligne arrive bientôt. En attendant, nous ouvrons votre espace avec vous —
                réponse sous 24 h ouvrées.
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Offres : Événement 800 € HT · Pack 3 à 2 100 € HT · Agence 6 000 € HT / an · Média Plus +200 €
              </p>
              <a className="btn btn-primary" href={contactMailto(ACCESS_SUBJECT)}>
                Demander l’ouverture de votre espace
              </a>
              <p className="muted" style={{ margin: 0 }}>
                ou écrivez-nous à <strong>{CONTACT_EMAIL}</strong>
              </p>
              <Link to="/admin/login" className="auth-link">
                Déjà un compte ? Se connecter
              </Link>
            </>
          ) : (
            <>
              <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {config?.positioning}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--space-3)',
                }}
              >
                {launchOffers.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="card"
                    onClick={() => setPlanId(o.id)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      border:
                        planId === o.id
                          ? '2px solid var(--color-accent, #5b5bd6)'
                          : '1px solid var(--color-border, #e5e5e5)',
                      padding: 'var(--space-3)',
                      background: planId === o.id ? 'var(--color-surface-2, #f8f8fc)' : undefined,
                    }}
                  >
                    {o.highlighted && (
                      <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
                        Recommandé
                      </span>
                    )}
                    <strong style={{ display: 'block', marginTop: 4 }}>{o.name}</strong>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>{o.priceLabel}</div>
                    <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                      {o.tagline}
                    </p>
                  </button>
                ))}
              </div>

              {selected && (
                <ul className="stack" style={{ gap: 6, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {selected.features.slice(0, 8).map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-sm)' }}>
                      <Check size={16} color="var(--color-success)" strokeWidth={2.4} /> {f}
                    </li>
                  ))}
                  <li style={{ display: 'flex', gap: 8, fontSize: 'var(--text-sm)' }}>
                    <Check size={16} color="var(--color-success)" strokeWidth={2.4} /> Google Drive connecté inclus
                  </li>
                </ul>
              )}

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
                  Après paiement, un lien envoyé à cet email vous permettra de définir votre mot de passe.
                </p>
                <button type="submit" className="btn btn-primary" disabled={!canSubmit || !selected?.checkoutAvailable}>
                  {busy
                    ? 'Redirection…'
                    : selected?.checkoutAvailable
                      ? `Continuer — ${selected.priceLabel}`
                      : 'Paiement non configuré pour cette offre'}
                </button>
                <Link to="/admin/login" className="auth-link">
                  Déjà un compte ? Se connecter
                </Link>
              </form>

              <GoogleButton onCredential={onGoogle} text="signup_with" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
