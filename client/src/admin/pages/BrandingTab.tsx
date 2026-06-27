import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSettings } from '../lib/types';
import { BrandingEditor } from '../components/settings/BrandingEditor';

export function BrandingTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error } = useFetch<EventSettings>(
    () => apiAuthed.get<EventSettings>(`/admin/events/${eventId}/settings`),
    [eventId],
  );
  const ev = useFetch(() => apiAuthed.get<{ name: string }>(`/admin/events/${eventId}`), [eventId]);

  if (loading || !data) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return <BrandingEditor eventId={eventId} initial={data.branding} eventName={ev.data?.name ?? 'Événement'} />;
}
