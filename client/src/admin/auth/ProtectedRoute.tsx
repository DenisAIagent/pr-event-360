import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Garde les routes du back-office : redirige vers /admin/login si aucune session. */
export function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
