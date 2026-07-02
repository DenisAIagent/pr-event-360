import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { MfaEnrollmentGate } from './MfaEnrollmentGate';

/**
 * Garde les routes du back-office : redirige vers /admin/login si aucune session,
 * et impose l'enrôlement MFA (comptes à privilèges) avant tout accès à l'app —
 * miroir de l'enforcement serveur, qui bloque de toute façon les requêtes.
 */
export function ProtectedRoute() {
  const { user, mfaSetupRequired } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (mfaSetupRequired) return <MfaEnrollmentGate />;
  return <Outlet />;
}
