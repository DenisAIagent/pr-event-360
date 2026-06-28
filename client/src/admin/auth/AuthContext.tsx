import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../../lib/api';

export type UserRole = 'admin' | 'attache' | 'assistant';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  isPlatformAdmin: boolean;
  subscriptionStatus?: string;
}

/** Le login renvoie un challenge MFA si la double authentification est active. */
type LoginOutcome = { mfaRequired: true; challenge: string } | undefined;

/** Connexion Google : un compte inconnu renvoie `needsSignup` (l'inscription se fait via l'abonnement). */
type GoogleOutcome = { needsSignup: true } | undefined;

interface AuthValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeMfa: (challenge: string, code: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<GoogleOutcome>;
  switchOrg: (orgId: string) => Promise<void>;
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

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    const result = await api.post<
      { token: string; user: AuthUser } | { mfaRequired: true; challenge: string }
    >('/admin/auth/login', { email, password });
    if ('mfaRequired' in result) {
      return { mfaRequired: true, challenge: result.challenge };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setState(result);
    return undefined;
  }, []);

  const completeMfa = useCallback(async (challenge: string, code: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/admin/auth/login/mfa', {
      challenge,
      code,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setState(result);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<GoogleOutcome> => {
    const result = await api.post<{ token: string; user: AuthUser } | { needsSignup: true }>(
      '/admin/auth/google',
      { credential },
    );
    if ('needsSignup' in result) return { needsSignup: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setState(result);
    return undefined;
  }, []);

  const switchOrg = useCallback(
    async (orgId: string) => {
      const result = await api.post<{ token: string; user: AuthUser }>(
        `/admin/organizations/${orgId}/switch`,
        undefined,
        state?.token ?? undefined,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      setState(result);
    },
    [state],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      token: state?.token ?? null,
      user: state?.user ?? null,
      login,
      completeMfa,
      loginWithGoogle,
      switchOrg,
      logout,
    }),
    [state, login, completeMfa, loginWithGoogle, switchOrg, logout],
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
