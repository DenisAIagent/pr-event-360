import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Garde les routes du back-office : redirige vers /admin/login sans jeton. */
export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
