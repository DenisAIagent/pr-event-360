import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSettings, EventSummary } from '../lib/types';
import { getEventProfile } from '../../lib/eventProfiles';
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
  const event = useFetch<EventSummary>(
    () => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`),
    [eventId],
  );
  const profile = getEventProfile(event.data?.eventType);

  if (loading) return <p className="muted">Chargement…</p>;
  if (error || !data) return <div className="banner banner-error">{error ?? 'Erreur'}</div>;

  return (
    <div className="stack">
      <DeadlineCard eventId={eventId} />
      <SubdomainCard eventId={eventId} />
      <DomainCard eventId={eventId} />
      <RecapCard eventId={eventId} initial={data.recap} onSaved={reload} />
      <ConfigForm eventId={eventId} config={data.config} participantLabel={profile.participantSingular} />
      <PhotoRulesCard eventId={eventId} config={data.config} eventType={profile.type} />
      <TypeWeights eventId={eventId} weights={data.typeWeights} onSaved={reload} />
      <MediaTypes eventId={eventId} mediaTypes={data.mediaTypes} onSaved={reload} />
      <Templates eventId={eventId} templates={data.templates} onSaved={reload} />
    </div>
  );
}
