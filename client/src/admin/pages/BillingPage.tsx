import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { PageHero } from '../components/PageHero';
import { ACCESS_SUBJECT, CONTACT_EMAIL, contactMailto } from '../../lib/contact';

interface BillingStatus {
  commercialPlan: string;
  planName: string;
  eventCreditsBalance: number | null;
  eventCreditsUnlimited: boolean;
  eventCreditsExpireAt: string | null;
  billingSource: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  storageDefaultLabel: string;
  googleDriveIncluded: boolean;
  offers: {
    id: string;
    name: string;
    priceLabel: string;
    tagline: string;
    checkoutAvailable: boolean;
  }[];
}

export function BillingPage() {
  const api = useAuthedApi();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api.get<BillingStatus>('/admin/billing/status'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger la facturation');
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function purchase(planId: string) {
    setBusy(planId);
    setError(null);
    try {
      const res = await api.post<{ url?: string; billingEnabled?: boolean; message?: string }>(
        '/admin/billing/purchase',
        { planId },
      );
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.message ?? 'Paiement en ligne indisponible — contactez le support.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Achat impossible');
    } finally {
      setBusy(null);
    }
  }

  const paid = params.get('paid') === '1';

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <PageHero
        title="Facturation & licences"
        subtitle="Crédits événement, offres et options (Média Plus, packs)."
      />

      {paid && (
        <div className="banner banner-success">Paiement reçu — vos crédits seront mis à jour sous peu.</div>
      )}
      {error && <div className="banner banner-error">{error}</div>}

      {status && (
        <>
          <div className="card stack" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Votre organisation</h2>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '8px 16px',
                margin: 0,
                fontSize: 'var(--text-sm)',
              }}
            >
              <dt className="muted">Offre</dt>
              <dd style={{ margin: 0 }}>
                <strong>{status.planName}</strong> ({status.commercialPlan})
              </dd>
              <dt className="muted">Crédits événement</dt>
              <dd style={{ margin: 0 }}>
                {status.eventCreditsUnlimited
                  ? 'Illimités'
                  : `${status.eventCreditsBalance ?? 0} restant(s)`}
              </dd>
              {status.eventCreditsExpireAt && (
                <>
                  <dt className="muted">Expiration crédits</dt>
                  <dd style={{ margin: 0 }}>{new Date(status.eventCreditsExpireAt).toLocaleDateString('fr-FR')}</dd>
                </>
              )}
              <dt className="muted">Stockage</dt>
              <dd style={{ margin: 0 }}>{status.storageDefaultLabel}</dd>
              <dt className="muted">Google Drive</dt>
              <dd style={{ margin: 0 }}>{status.googleDriveIncluded ? 'Inclus' : '—'}</dd>
              <dt className="muted">Statut abonnement</dt>
              <dd style={{ margin: 0 }}>{status.subscriptionStatus}</dd>
            </dl>
            {(status.eventCreditsBalance === 0 ||
              (status.eventCreditsBalance != null && status.eventCreditsBalance < 2)) &&
              !status.eventCreditsUnlimited && (
                <div className="banner banner-info">
                  Peu ou plus de crédits. Achetez un pack ou une licence pour créer de nouveaux événements.
                </div>
              )}
          </div>

          <div className="card stack" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} /> Acheter des licences
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {status.offers.map((o) => (
                <div key={o.id} className="card" style={{ padding: 'var(--space-3)' }}>
                  <strong>{o.name}</strong>
                  <div style={{ fontWeight: 700, margin: '6px 0' }}>{o.priceLabel}</div>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '0 0 12px' }}>
                    {o.tagline}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === o.id || !o.checkoutAvailable}
                    onClick={() => void purchase(o.id)}
                  >
                    {busy === o.id ? '…' : o.checkoutAvailable ? 'Acheter' : 'Sur devis'}
                  </button>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
              Média Plus (+200 € HT, 100 Go) s’achète pour un événement précis depuis la médiathèque (bientôt) ou
              via{' '}
              <a href={contactMailto(ACCESS_SUBJECT)}>{CONTACT_EMAIL}</a>.
            </p>
            <Link to="/admin" className="auth-link">
              ← Retour aux événements
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
