import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GsiId {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (parent: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

/** Charge le script Google Identity Services une seule fois. */
function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Chargement Google impossible')));
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Chargement Google impossible'));
    document.head.appendChild(s);
  });
}

type NeedsOrg = { challenge: string; fullName: string; email: string };

/**
 * « Continuer avec Google ». Dormant si l'ID client n'est pas configuré (rend `null`).
 * Pour un nouveau compte, affiche l'étape « nom de l'organisation » avant de finaliser.
 */
export function GoogleAuth() {
  const { loginWithGoogle, completeGoogleSignup } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [needsOrg, setNeedsOrg] = useState<NeedsOrg | null>(null);
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 1. Récupère la config publique (l'ID client Google, ou rien).
  useEffect(() => {
    let alive = true;
    api
      .get<{ googleEnabled: boolean; googleClientId: string | null }>('/admin/auth/config')
      .then((c) => {
        if (alive && c.googleEnabled && c.googleClientId) setClientId(c.googleClientId);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // 2. Initialise GIS et rend le bouton (tant qu'on n'est pas à l'étape organisation).
  useEffect(() => {
    if (!clientId || needsOrg) return;
    let alive = true;
    loadGsi()
      .then(() => {
        if (!alive || !btnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp) => {
            setError(null);
            try {
              const outcome = await loginWithGoogle(resp.credential);
              if (outcome?.needsOrg) {
                setNeedsOrg({ challenge: outcome.challenge, fullName: outcome.fullName, email: outcome.email });
              } else {
                navigate('/admin', { replace: true });
              }
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Connexion Google impossible');
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
        });
      })
      .catch(() => setError('Chargement de Google impossible'));
    return () => {
      alive = false;
    };
  }, [clientId, needsOrg, loginWithGoogle, navigate]);

  async function submitOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!needsOrg || !orgName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await completeGoogleSignup(needsOrg.challenge, orgName.trim());
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription Google impossible');
    } finally {
      setBusy(false);
    }
  }

  if (!clientId) return null;

  if (needsOrg) {
    return (
      <form onSubmit={submitOrg} className="stack" style={{ marginTop: 'var(--space-3)' }}>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Bienvenue {needsOrg.fullName.split(' ')[0]} ! Nommez votre organisation pour créer votre espace.
        </p>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="field">
          <label>Nom de votre organisation</label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Ex. Agence Présence / Festival X"
            required
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !orgName.trim()}>
          {busy ? 'Création…' : 'Créer mon espace'}
        </button>
      </form>
    );
  }

  return (
    <div className="google-auth">
      <div className="google-auth-divider"><span>ou</span></div>
      {error && <div className="banner banner-error">{error}</div>}
      <div ref={btnRef} className="google-auth-btn" />
    </div>
  );
}
