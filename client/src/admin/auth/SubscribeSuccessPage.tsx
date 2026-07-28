import { Link } from 'react-router-dom';

/**
 * Retour après paiement Stripe réussi. Le compte est matérialisé par le webhook (asynchrone) :
 * le propriétaire d'un compte email doit d'abord prouver l'adresse via le lien reçu.
 */
export function SubscribeSuccessPage() {
  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <div>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 40, display: 'block' }} />
          <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-2)' }}>
            Paiement reçu 🎉
          </span>
        </div>
        <div className="banner banner-success">
          Merci ! Votre abonnement est actif et votre espace est en cours de création (quelques secondes).
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Si vous avez utilisé votre email, ouvrez le lien de définition du mot de passe que nous venons
          de vous envoyer. Si vous avez utilisé Google, vous pouvez vous connecter immédiatement.
        </p>
        <Link to="/admin/login" className="btn btn-primary" style={{ textAlign: 'center' }}>
          Se connecter
        </Link>
      </div>
    </main>
  );
}
