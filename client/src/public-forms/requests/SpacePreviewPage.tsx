import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import type { SpaceResponse } from '../../lib/types';
import { SpacePage } from './SpacePage';

/**
 * Aperçu de l'espace journaliste, destiné à être chargé dans l'iframe de l'onglet
 * « Aperçu » du back-office. La session admin est transmise par cookie httpOnly,
 * comme dans le reste du back-office : aucun jeton n'est lu par JavaScript.
 */
export function SpacePreviewPage() {
  const { eventId = '' } = useParams();
  const [data, setData] = useState<SpaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SpaceResponse>(`/admin/events/${eventId}/space-preview`)
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
