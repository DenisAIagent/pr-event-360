import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSettings } from '../lib/types';
import {
  DeadlineCard,
  RecapCard,
  ConfigForm,
  PhotoRulesCard,
  TypeWeights,
  MediaTypes,
  Templates,
} from '../components/settings/SettingsCards';
import { DomainCard } from '../components/settings/DomainCard';
import { SubdomainCard } from '../components/settings/SubdomainCard';

export function SettingsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<EventSettings>(
    () => apiAuthed.get<EventSettings>(`/admin/events/${eventId}/settings`),
    [eventId],
  );

  if (loading) return <p className="muted">Chargement…</p>;
  if (error || !data) return <div className="banner banner-error">{error ?? 'Erreur'}</div>;

  return (
    <div className="stack">
      <DeadlineCard eventId={eventId} />
      <SubdomainCard eventId={eventId} />
      <DomainCard eventId={eventId} />
      <RecapCard eventId={eventId} initial={data.recap} onSaved={reload} />
      <ConfigForm eventId={eventId} config={data.config} />
      <PhotoRulesCard eventId={eventId} config={data.config} />
      <TypeWeights eventId={eventId} weights={data.typeWeights} onSaved={reload} />
      <MediaTypes eventId={eventId} mediaTypes={data.mediaTypes} onSaved={reload} />
      <Templates eventId={eventId} templates={data.templates} onSaved={reload} />
    </div>
  );
}
