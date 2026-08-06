import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { MfaEnrollmentGate } from './MfaEnrollmentGate';

/**
 * Garde les routes du back-office : redirige vers /admin/login si aucune session
 * serveur (après hydrate /me), et impose l'enrôlement MFA (comptes à privilèges)
 * avant tout accès à l'app — miroir de l'enforcement serveur.
 */
export function ProtectedRoute() {
  const { user, sessionChecked, mfaSetupRequired } = useAuth();

  // Attendre la revalidation cookie avant de décider (évite UI sur localStorage forgé).
  if (!sessionChecked) {
    return (
      <main className="login-wrap" aria-busy="true">
        <div className="muted" style={{ textAlign: 'center' }}>
          Vérification de la session…
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (mfaSetupRequired) return <MfaEnrollmentGate />;
  return <Outlet />;
}
