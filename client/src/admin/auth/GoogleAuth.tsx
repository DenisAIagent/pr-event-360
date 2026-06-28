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

/**
 * Bouton Google réutilisable. Dormant si l'ID client n'est pas configuré (rend `null`).
 * Renvoie l'ID token Google via `onCredential`. `text` : libellé GIS (continue_with / signup_with).
 */
export function GoogleButton({
  onCredential,
  text = 'continue_with',
}: {
  onCredential: (credential: string) => void;
  text?: string;
}) {
  const btnRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadGsi()
      .then(() => {
        if (!alive || !btnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => cbRef.current(resp.credential),
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text,
          shape: 'rectangular',
        });
      })
      .catch(() => setError('Chargement de Google impossible'));
    return () => {
      alive = false;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <div className="google-auth">
      <div className="google-auth-divider">
        <span>ou</span>
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      <div ref={btnRef} className="google-auth-btn" />
    </div>
  );
}

/** « Continuer avec Google » sur la page de connexion : un compte inconnu → page d'abonnement. */
export function GoogleAuth() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handle(credential: string) {
    setError(null);
    try {
      const outcome = await loginWithGoogle(credential);
      if (outcome?.needsSignup) {
        navigate('/admin/abonnement', { state: { fromGoogle: true } });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion Google impossible');
    }
  }

  return (
    <>
      <GoogleButton onCredential={handle} text="continue_with" />
      {error && (
        <div className="banner banner-error" style={{ marginTop: 'var(--space-2)' }}>
          {error}
        </div>
      )}
    </>
  );
}
