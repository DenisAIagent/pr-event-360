import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../../lib/api';

export type UserRole = 'admin' | 'attache' | 'assistant';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'pr360.auth';
const AuthContext = createContext<AuthValue | null>(null);

function readStored(): { token: string; user: AuthUser } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { token: string; user: AuthUser }) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => readStored());

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/admin/auth/login', {
      email,
      password,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setState(result);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ token: state?.token ?? null, user: state?.user ?? null, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}

/**
 * Méthodes API liées au token courant. Déconnecte automatiquement sur 401
 * (jeton expiré/invalide) pour renvoyer l'utilisateur vers la connexion.
 */
export function useAuthedApi() {
  const { token, logout } = useAuth();
  return useMemo(() => {
    const guard = async <T,>(p: Promise<T>): Promise<T> => {
      try {
        return await p;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    };
    return {
      get: <T,>(path: string) => guard(api.get<T>(path, token ?? undefined)),
      post: <T,>(path: string, body?: unknown) => guard(api.post<T>(path, body, token ?? undefined)),
      put: <T,>(path: string, body?: unknown) => guard(api.put<T>(path, body, token ?? undefined)),
      delete: <T,>(path: string) => guard(api.del<T>(path, token ?? undefined)),
    };
  }, [token, logout]);
}
