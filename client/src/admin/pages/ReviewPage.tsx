import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import type { AppReview, MyReviewResponse } from '../lib/types';

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

const STATUS_LABEL: Record<AppReview['status'], { text: string; cls: string }> = {
  pending: { text: 'En attente de relecture', cls: 'badge-warn' },
  approved: { text: 'Approuvé — visible sur la page d’accueil', cls: 'badge-success' },
  rejected: { text: 'Non retenu', cls: 'badge' },
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
    <div className="stack" style={{ maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Votre avis</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Dites-nous ce que vous pensez de l’outil. Avec votre accord, votre avis pourra être affiché
          sur notre page d’accueil après relecture.
        </p>
      </div>

      {status && (
        <div className={`badge ${STATUS_LABEL[status].cls}`} style={{ alignSelf: 'flex-start' }}>
          {STATUS_LABEL[status].text}
        </div>
      )}

      <div className="card stack">
        {err && <div className="banner banner-error">{err}</div>}

        <div className="field">
          <label>Votre note</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="field">
          <label>Votre témoignage</label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Ce que l’outil vous a apporté, le temps gagné, ce que vous avez préféré…"
          />
        </div>

        <div className="grid-2">
          <div className="field" style={{ margin: 0 }}>
            <label>Nom affiché</label>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={120} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Fonction (optionnel)</label>
            <input
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              maxLength={80}
              placeholder="ex. Attaché de presse"
            />
          </div>
        </div>
        <div className="field">
          <label>Structure / festival (optionnel)</label>
          <input value={authorOrg} onChange={(e) => setAuthorOrg(e.target.value)} maxLength={120} />
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={consentPublic} onChange={(e) => setConsentPublic(e.target.checked)} />
          <span>
            J’autorise la publication de cet avis (nom affiché, fonction et structure) sur la page
            d’accueil publique. Vous pouvez le retirer à tout moment en nous contactant.
          </span>
        </label>

        <button className="btn btn-primary" onClick={save} disabled={busy || loading} style={{ alignSelf: 'flex-start' }}>
          {busy ? 'Envoi…' : data?.review ? 'Mettre à jour mon avis' : 'Envoyer mon avis'}
        </button>
      </div>
    </div>
  );
}
