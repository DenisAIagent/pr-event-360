import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

/**
 * Ouverture d'un lien d'accès journaliste : échange le jeton (dans l'URL) contre une
 * SESSION (cookie httpOnly), puis redirige vers l'espace SANS token dans l'URL.
 * Le jeton ne transite qu'ici, une fois ; ensuite tout passe par le cookie.
 */
export function AccessExchangePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // StrictMode : n'échange qu'une fois
    done.current = true;
    api
      .post('/public/journalist/access', { token })
      .then(() => navigate('/espace', { replace: true }))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Lien invalide ou expiré.'));
  }, [token, navigate]);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      {error ? (
        <div className="card stack" style={{ maxWidth: 420, textAlign: 'center' }}>
          <p>{error}</p>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
            Demandez un nouveau lien d'accès ou connectez-vous avec votre email et votre mot de passe.
          </p>
        </div>
      ) : (
        <p className="muted">Connexion à votre espace…</p>
      )}
    </main>
  );
}
