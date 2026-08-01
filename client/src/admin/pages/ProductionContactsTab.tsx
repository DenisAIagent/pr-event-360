import { Link, useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSummary, Lineup } from '../lib/types';
import { PageHero } from '../components/PageHero';
import { ProductionContacts } from '../components/lineup/ProductionContacts';
import { SkeletonRows } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { getEventProfile } from '../../lib/eventProfiles';

/**
 * Onglet dédié aux contacts production / managers d'artistes.
 * Sorti de Configuration pour un accès direct (envoi de liens de validation).
 */
export function ProductionContactsTab() {
  const { eventId = '' } = useParams();
  const api = useAuthedApi();
  const lineup = useFetch<Lineup>(() => api.get<Lineup>(`/admin/events/${eventId}/lineup`), [eventId]);
  const event = useFetch<EventSummary>(() => api.get<EventSummary>(`/admin/events/${eventId}`), [eventId]);
  const profile = getEventProfile(event.data?.eventType);
  const artists = lineup.data?.artists ?? [];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Validation externe"
        title="Contacts production"
        subtitle="Managers et productions d’artistes : envoyez un lien personnel pour recueillir un avis consultatif sur les demandes d’interview."
      />

      {lineup.loading && <SkeletonRows count={3} />}
      {lineup.error && <div className="banner banner-error">{lineup.error}</div>}

      {!lineup.loading && !lineup.error && artists.length === 0 && (
        <EmptyState
          icon={Clapperboard}
          title={`Aucun ${profile.participantSingular.toLocaleLowerCase('fr')} encore`}
          hint={
            <>
              Ajoutez d’abord des {profile.participantPlural.toLocaleLowerCase('fr')} dans{' '}
              <Link to={`/admin/events/${eventId}/lineup`} className="auth-link">
                Configuration
              </Link>
              , puis revenez ici pour rattacher un contact production.
            </>
          }
        />
      )}

      {!lineup.loading && artists.length > 0 && (
        <ProductionContacts
          eventId={eventId}
          artists={artists.map((a) => ({ id: a.id, name: a.name }))}
        />
      )}
    </div>
  );
}
