import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import type { SpaceResponse } from '../../lib/types';
import { SpacePage } from './SpacePage';

/** Lit le jeton admin stocké par le back-office (même origine → localStorage partagé). */
function readAdminToken(): string | null {
  try {
    const raw = localStorage.getItem('pr360.auth');
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Aperçu de l'espace journaliste, destiné à être chargé dans l'iframe de l'onglet
 * « Aperçu » du back-office. Récupère des données d'exemple via l'API admin.
 */
export function SpacePreviewPage() {
  const { eventId = '' } = useParams();
  const [data, setData] = useState<SpaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readAdminToken();
    if (!token) {
      setError('Connectez-vous au back-office pour afficher l’aperçu.');
      return;
    }
    api
      .get<SpaceResponse>(`/admin/events/${eventId}/space-preview`, token)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Aperçu indisponible'));
  }, [eventId]);

  if (error) {
    return (
      <main className="page">
        <div className="card">{error}</div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <p className="muted">Chargement de l’aperçu…</p>
      </main>
    );
  }
  return <SpacePage previewData={data} readOnly />;
}
