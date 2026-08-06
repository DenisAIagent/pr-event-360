import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
type GoogleOutcome = { needsSignup: true } | { mfaRequired: true; challenge: string } | undefined;

interface AuthValue {
  user: AuthUser | null;
  /**
   * false tant que GET /auth/me n'a pas tranché (cookie valide ou non).
   * Évite d'afficher le back-office sur un simple localStorage forgé.
   */
  sessionChecked: boolean;
  /** Compte à privilèges dont la MFA obligatoire n'est pas encore activée : accès bloqué hors enrôlement. */
  mfaSetupRequired: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeMfa: (challenge: string, code: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<GoogleOutcome>;
  acceptOrgInvite: (body: { token: string; orgName: string; fullName?: string; password?: string; googleCredential?: string }) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  /** Appelé après activation réussie de la MFA : lève le blocage d'enrôlement. */
  onMfaEnabled: () => void;
  logout: () => void;
}

// On ne persiste QUE le profil (non sensible) pour l'affichage instantané du rail.
// Le jeton de session vit dans un cookie httpOnly, jamais accessible au JavaScript.
// Au boot, /admin/auth/me revalide le cookie et efface le storage si invalide.
const STORAGE_KEY = 'pr360.user';
const AuthContext = createContext<AuthValue | null>(null);

function readStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function toAuthUser(raw: AuthUser & { id?: string }): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName,
    role: raw.role,
    organizationId: raw.organizationId,
    organizationName: raw.organizationName,
    isPlatformAdmin: raw.isPlatformAdmin,
    subscriptionStatus: raw.subscriptionStatus,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored());
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const persist = useCallback((u: AuthUser) => {
    const normalized = toAuthUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setUser(normalized);
  }, []);

  // Hydratation obligatoire : le cookie httpOnly est la source de vérité.
  // Sans session serveur, on purge le localStorage (anti cosplay d'UI admin).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<{ user: AuthUser; mfaSetupRequired?: boolean }>('/admin/auth/me');
        if (cancelled) return;
        persist(me.user);
        setMfaSetupRequired(Boolean(me.mfaSetupRequired));
      } catch {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
          setMfaSetupRequired(false);
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const result = await api.post<
        { user: AuthUser; mfaSetupRequired?: boolean } | { mfaRequired: true; challenge: string }
      >('/admin/auth/login', { email, password });
      if ('mfaRequired' in result) return { mfaRequired: true, challenge: result.challenge };
      setMfaSetupRequired(Boolean(result.mfaSetupRequired));
      persist(result.user);
      setSessionChecked(true);
      return undefined;
    },
    [persist],
  );

  const completeMfa = useCallback(
    async (challenge: string, code: string) => {
      const result = await api.post<{ user: AuthUser }>('/admin/auth/login/mfa', { challenge, code });
      setMfaSetupRequired(false);
      persist(result.user);
      setSessionChecked(true);
    },
    [persist],
  );

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<GoogleOutcome> => {
      const result = await api.post<
        | { user: AuthUser; mfaSetupRequired?: boolean }
        | { needsSignup: true }
        | { mfaRequired: true; challenge: string }
      >('/admin/auth/google', { credential });
      if ('needsSignup' in result) return { needsSignup: true };
      if ('mfaRequired' in result) return { mfaRequired: true, challenge: result.challenge };
      setMfaSetupRequired(Boolean(result.mfaSetupRequired));
      persist(result.user);
      setSessionChecked(true);
      return undefined;
    },
    [persist],
  );

  const acceptOrgInvite = useCallback(
    async (body: { token: string; orgName: string; fullName?: string; password?: string; googleCredential?: string }) => {
      const result = await api.post<{ user: AuthUser }>('/admin/auth/org-invite/accept', body);
      persist(result.user);
      setSessionChecked(true);
    },
    [persist],
  );

  const switchOrg = useCallback(
    async (orgId: string) => {
      const result = await api.post<{ user: AuthUser }>(`/admin/organizations/${orgId}/switch`);
      persist(result.user);
    },
    [persist],
  );

  const onMfaEnabled = useCallback(() => setMfaSetupRequired(false), []);

  const logout = useCallback(() => {
    void api.post('/admin/auth/logout').catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setMfaSetupRequired(false);
    setSessionChecked(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      sessionChecked,
      mfaSetupRequired,
      login,
      completeMfa,
      loginWithGoogle,
      acceptOrgInvite,
      switchOrg,
      onMfaEnabled,
      logout,
    }),
    [
      user,
      sessionChecked,
      mfaSetupRequired,
      login,
      completeMfa,
      loginWithGoogle,
      acceptOrgInvite,
      switchOrg,
      onMfaEnabled,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}

/**
 * Méthodes API du back-office. L'authentification passe par le cookie de session
 * (envoyé automatiquement), plus par un jeton en mémoire. Déconnecte sur 401
 * (session expirée/invalide) pour renvoyer vers la connexion.
 */
export function useAuthedApi() {
  const { logout } = useAuth();
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
      get: <T,>(path: string) => guard(api.get<T>(path)),
      post: <T,>(path: string, body?: unknown) => guard(api.post<T>(path, body)),
      put: <T,>(path: string, body?: unknown) => guard(api.put<T>(path, body)),
      patch: <T,>(path: string, body?: unknown) => guard(api.patch<T>(path, body)),
      delete: <T,>(path: string) => guard(api.del<T>(path)),
    };
  }, [logout]);
}
