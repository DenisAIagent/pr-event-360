import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { NotificationRow } from '../lib/types';
import { TRIGGER_LABEL } from '../lib/labels';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function MessagesTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error } = useFetch<NotificationRow[]>(
    () => apiAuthed.get<NotificationRow[]>(`/admin/events/${eventId}/messages`),
    [eventId],
  );
  const { data: notif } = useFetch<{ mode: 'live' | 'simulation' }>(
    () => apiAuthed.get<{ mode: 'live' | 'simulation' }>('/admin/notif-mode'),
    [],
  );
  const isLive = notif?.mode === 'live';

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  return (
    <div className="flex flex-col gap-4">
      {isLive ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✅ <strong>Envoi réel (live)</strong> : ces messages sont <strong>réellement envoyés</strong> aux
          destinataires (via Brevo/Twilio) et journalisés ici.
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Mode simulation : ces messages sont journalisés et affichés ici, <strong>jamais envoyés</strong>.
          Configurez le mode « live » dans Intégrations pour activer l'envoi réel.
        </p>
      )}
      {data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun message {isLive ? '' : 'simulé '}pour l'instant.</p>
      )}
      {data?.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <strong>{TRIGGER_LABEL[m.triggerKey] ?? m.triggerKey}</strong>
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{m.channel}</Badge>
                <Badge variant="secondary">{m.lang.toUpperCase()}</Badge>
                <Badge className="border-transparent bg-blue-100 text-blue-800">{m.status}</Badge>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              À : {m.toAddress} · via {m.provider}
            </div>
            {m.subject && <p className="mt-2 font-semibold">{m.subject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
