import { Star } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import type { AppReview, ReviewStatus } from '../lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} fill={i <= n ? '#f5b50a' : 'none'} color={i <= n ? '#f5b50a' : '#c3c7cd'} />
      ))}
    </span>
  );
}

const STATUS: Record<ReviewStatus, { text: string; className: string }> = {
  pending: { text: 'En attente', className: 'border-transparent bg-amber-100 text-amber-800' },
  approved: { text: 'Approuvé', className: 'border-transparent bg-emerald-100 text-emerald-800' },
  rejected: { text: 'Rejeté', className: 'bg-secondary text-secondary-foreground' },
};

export function ReviewsModerationPage() {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<AppReview[]>(
    () => apiAuthed.get<AppReview[]>('/admin/reviews'),
    [],
  );

  async function setStatus(id: string, status: ReviewStatus) {
    await apiAuthed.post(`/admin/reviews/${id}/status`, { status });
    toast.success(status === 'approved' ? 'Avis approuvé — visible sur la landing.' : 'Avis mis à jour.');
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Modération des avis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seuls les avis <strong>approuvés</strong> et dont l’auteur a <strong>autorisé la publication</strong>{' '}
          apparaissent sur la page d’accueil.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun avis pour l’instant.</p>}

      <div className="flex flex-col gap-4">
        {data?.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars n={r.rating} />
                  <div className="mt-1">
                    <strong>{r.authorName}</strong>
                    {(r.authorRole || r.authorOrg) && (
                      <span className="text-sm text-muted-foreground">
                        {' '}
                        · {[r.authorRole, r.authorOrg].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!r.consentPublic && (
                    <Badge variant="secondary" title="L’auteur n’a pas autorisé la publication">
                      Sans consentement
                    </Badge>
                  )}
                  <Badge className={STATUS[r.status].className}>{STATUS[r.status].text}</Badge>
                </div>
              </div>

              <blockquote className="m-0 italic text-foreground">« {r.quote} »</blockquote>

              <div className="flex gap-2">
                {r.status !== 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => setStatus(r.id, 'approved')}
                    disabled={!r.consentPublic}
                    title={r.consentPublic ? '' : 'L’auteur n’a pas autorisé la publication'}
                  >
                    Approuver
                  </Button>
                )}
                {r.status !== 'rejected' && (
                  <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, 'rejected')}>
                    Rejeter
                  </Button>
                )}
                {r.status === 'approved' && (
                  <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, 'pending')}>
                    Retirer de la landing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
