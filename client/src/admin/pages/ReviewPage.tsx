import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import type { AppReview, MyReviewResponse } from '../lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Sélecteur d'étoiles (cliquable). */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'inline-flex', gap: 4 }} role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            aria-checked={value === n}
            role="radio"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
          >
            <Star size={28} fill={on ? '#f5b50a' : 'none'} color={on ? '#f5b50a' : '#c3c7cd'} />
          </button>
        );
      })}
    </div>
  );
}

const STATUS_LABEL: Record<AppReview['status'], { text: string; className: string }> = {
  pending: { text: 'En attente de relecture', className: 'border-transparent bg-amber-100 text-amber-800' },
  approved: {
    text: 'Approuvé — visible sur la page d’accueil',
    className: 'border-transparent bg-emerald-100 text-emerald-800',
  },
  rejected: { text: 'Non retenu', className: 'bg-secondary text-secondary-foreground' },
};

export function ReviewPage() {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const { data, loading, reload } = useFetch<MyReviewResponse>(
    () => apiAuthed.get<MyReviewResponse>('/admin/review'),
    [],
  );

  const [rating, setRating] = useState(0);
  const [quote, setQuote] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [authorOrg, setAuthorOrg] = useState('');
  const [consentPublic, setConsentPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pré-remplissage depuis l'avis existant ou les suggestions (nom / structure).
  useEffect(() => {
    if (!data) return;
    const r = data.review;
    setRating(r?.rating ?? 0);
    setQuote(r?.quote ?? '');
    setAuthorName(r?.authorName ?? data.suggested.authorName);
    setAuthorRole(r?.authorRole ?? '');
    setAuthorOrg(r?.authorOrg ?? data.suggested.authorOrg);
    setConsentPublic(r?.consentPublic ?? false);
  }, [data]);

  async function save() {
    setErr(null);
    if (rating < 1) return setErr('Choisissez une note (1 à 5 étoiles).');
    if (!quote.trim()) return setErr('Écrivez quelques mots sur votre expérience.');
    setBusy(true);
    try {
      await apiAuthed.post('/admin/review', {
        rating,
        quote: quote.trim(),
        authorName: authorName.trim(),
        authorRole: authorRole.trim() || null,
        authorOrg: authorOrg.trim() || null,
        consentPublic,
      });
      toast.success('Merci ! Votre avis a été envoyé.');
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  const status = data?.review?.status;

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 640 }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Votre avis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dites-nous ce que vous pensez de l’outil. Avec votre accord, votre avis pourra être affiché
          sur notre page d’accueil après relecture.
        </p>
      </div>

      {status && (
        <Badge className={`self-start ${STATUS_LABEL[status].className}`}>{STATUS_LABEL[status].text}</Badge>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label>Votre note</Label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="review-quote">Votre témoignage</Label>
            <Textarea
              id="review-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Ce que l’outil vous a apporté, le temps gagné, ce que vous avez préféré…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="review-author-name">Nom affiché</Label>
              <Input
                id="review-author-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-author-role">Fonction (optionnel)</Label>
              <Input
                id="review-author-role"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                maxLength={80}
                placeholder="ex. Attaché de presse"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-author-org">Structure / festival (optionnel)</Label>
            <Input
              id="review-author-org"
              value={authorOrg}
              onChange={(e) => setAuthorOrg(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="review-consent"
              checked={consentPublic}
              onCheckedChange={(v) => setConsentPublic(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="review-consent" className="text-sm font-normal leading-snug">
              J’autorise la publication de cet avis (nom affiché, fonction et structure) sur la page
              d’accueil publique. Vous pouvez le retirer à tout moment en nous contactant.
            </Label>
          </div>

          <Button onClick={save} disabled={busy || loading} className="self-start">
            {busy ? 'Envoi…' : data?.review ? 'Mettre à jour mon avis' : 'Envoyer mon avis'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
