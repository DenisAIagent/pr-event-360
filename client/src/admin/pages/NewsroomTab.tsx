import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { CopyLink } from '../components/CopyLink';
import { InfoBubble } from '../components/InfoBubble';
import { useToast } from '../components/Toast';
import { FileText } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { uploadToCloudinary } from '../lib/upload';
import type { PressRelease, UploadSignature } from '../lib/types';

/** Slug d'URL côté client (sans accents, minuscules, tirets) — miroir de server/src/lib/slug.ts. */
function toSlug(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'cp'
  );
}

/** Texte brut depuis du HTML (pour suggérer la description SEO). */
function htmlToText(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Modèle de départ de communiqué (pour les non-techniciens). */
const CP_STARTER_HTML = `<h1>Titre du communiqué</h1>
<p><strong>Lieu, le 1er janvier</strong> — Phrase d'accroche qui résume l'information principale.</p>
<p>Développez ici les détails : contexte, dates, citations…</p>
<p>Contact presse : Prénom Nom — email@exemple.com — 06 12 34 56 78.</p>`;

export function NewsroomTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<PressRelease[]>(
    () => apiAuthed.get<PressRelease[]>(`/admin/events/${eventId}/press-releases`),
    [eventId],
  );
  const [editing, setEditing] = useState<PressRelease | 'new' | null>(null);

  const newsroomUrl = `${window.location.origin}/newsroom/${eventId}`;

  return (
    <div className="stack">
      <section className="share-card">
        <div className="share-head">
          <strong>Newsroom publique</strong>
          <span className="muted">CP publiés + médias téléchargeables, à partager</span>
        </div>
        <CopyLink url={newsroomUrl} />
      </section>

      <div className="section-head">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Communiqués de presse</h2>
        {editing === null && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
            Nouveau communiqué
          </button>
        )}
      </div>

      {editing !== null && (
        <PressEditor
          eventId={eventId}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {loading && <p className="muted">Chargement…</p>}
      {error && <div className="banner banner-error">{error}</div>}

      <div className="stack">
        {data?.map((pr) => (
          <div key={pr.id} className="card row-between">
            <div>
              <strong>{pr.title}</strong>
              <span
                className={`badge ${pr.status === 'published' ? 'badge-success' : 'badge-warn'}`}
                style={{ marginLeft: 8 }}
              >
                {pr.status === 'published' ? 'Publié' : 'Brouillon'}
              </span>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {pr.publishedAt ? new Date(pr.publishedAt).toLocaleDateString('fr-FR') : 'Non publié'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(pr)}>
              Modifier
            </button>
          </div>
        ))}
        {data?.length === 0 && !loading && (
          <EmptyState
            icon={FileText}
            title="Aucun communiqué publié"
            hint="Rédigez votre premier communiqué ci-dessus — il apparaîtra dans la newsroom publique, accessible aux journalistes."
          />
        )}
      </div>
    </div>
  );
}

function PressEditor({
  eventId,
  initial,
  onClose,
  onSaved,
}: {
  eventId: string;
  initial: PressRelease | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveSlug = slug.trim() || toSlug(title || 'communique');
  const publicUrl = `${window.location.origin}/newsroom/${eventId}/${effectiveSlug}`;
  const descPreview = seoDescription.trim() || htmlToText(bodyHtml).slice(0, 155);
  const seoChecks = [
    { ok: title.trim().length >= 25 && title.trim().length <= 70, label: 'Titre de 25 à 70 caractères' },
    { ok: descPreview.length >= 50, label: 'Description d’au moins 50 caractères' },
    { ok: Boolean(coverImageUrl), label: 'Image de couverture (aperçu réseaux sociaux)' },
    { ok: /<h[1-3][\s>]/i.test(bodyHtml), label: 'Au moins un titre (H1/H2) dans le contenu' },
  ];

  async function onUploadCover(file: File) {
    setErr(null);
    setUploadBusy(true);
    try {
      const sig = await apiAuthed.post<UploadSignature>(`/admin/events/${eventId}/assets/sign`);
      const up = await uploadToCloudinary(file, sig);
      setCoverImageUrl(up.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec de l’upload');
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const willNotify = status === 'published' && notifyEmail;
      const payload = {
        title,
        bodyHtml,
        status,
        notifyEmail: willNotify,
        slug: slug.trim() || undefined,
        seoDescription: seoDescription.trim() || null,
        coverImageUrl: coverImageUrl || null,
      };
      const res = initial
        ? await apiAuthed.put<{ email: { sent: number; total: number } | null }>(
            `/admin/events/${eventId}/press-releases/${initial.id}`,
            payload,
          )
        : await apiAuthed.post<{ email: { sent: number; total: number } | null }>(
            `/admin/events/${eventId}/press-releases`,
            payload,
          );
      if (res.email) toast.success(`CP publié et envoyé à ${res.email.sent}/${res.email.total} accrédité(s).`);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setBusy(true);
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/press-releases/${initial.id}`);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <div className="row-between">
        <h3 style={{ fontSize: 'var(--text-lg)' }}>{initial ? 'Modifier le communiqué' : 'Nouveau communiqué'}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
      {err && <div className="banner banner-error">{err}</div>}
      <div className="field">
        <label>Titre</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Contenu (HTML)
            <InfoBubble title="Écrire le communiqué (HTML)">
              Le contenu s'écrit en <strong>HTML</strong> (balises). Les bases&nbsp;:
              <ul>
                <li>Titre : <code>{'<h1>Mon titre</h1>'}</code></li>
                <li>Paragraphe : <code>{'<p>Mon texte</p>'}</code></li>
                <li>Gras : <code>{'<strong>important</strong>'}</code></li>
                <li>Lien : <code>{'<a href="https://…">lien</a>'}</code></li>
              </ul>
              Pas à l'aise ? Cliquez <strong>« Insérer un modèle »</strong> et remplacez le texte.
            </InfoBubble>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (!bodyHtml.trim() || window.confirm('Remplacer le contenu actuel par le modèle ?')) {
                setBodyHtml(CP_STARTER_HTML);
              }
            }}
          >
            Insérer un modèle
          </button>
        </label>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={10}
          style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}
        />
      </div>
      <div className="field">
        <label>Aperçu</label>
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt=""
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
          />
        )}
        <div className="card" style={{ background: '#fff' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>

      <fieldset className="card stack" style={{ border: '1px solid var(--border, #e3e3e3)' }}>
        <legend style={{ padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Référencement & partage (SEO)
          <InfoBubble title="Pourquoi c’est important">
            Ces réglages soignent l’apparence du communiqué sur <strong>Google</strong> et dans les
            <strong> aperçus partagés</strong> (LinkedIn, X, Facebook, WhatsApp). Renseignés par défaut, ils
            sont modifiables.
          </InfoBubble>
        </legend>

        <div className="field">
          <label>Image de couverture (illustration + aperçu social)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {coverImageUrl && (
              <img src={coverImageUrl} alt="" style={{ height: 56, width: 96, objectFit: 'cover', borderRadius: 6 }} />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadCover(f);
              }}
            />
            {uploadBusy && <span className="muted">Upload…</span>}
            {coverImageUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCoverImageUrl(null)}>
                Retirer
              </button>
            )}
          </div>
          <input
            style={{ marginTop: 8 }}
            placeholder="…ou collez une URL d’image (https://)"
            value={coverImageUrl ?? ''}
            onChange={(e) => setCoverImageUrl(e.target.value || null)}
          />
        </div>

        <div className="field">
          <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>Description SEO (extrait affiché sur Google / aperçus)</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSeoDescription(htmlToText(bodyHtml).slice(0, 155))}
            >
              Générer depuis le contenu
            </button>
          </label>
          <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {descPreview.length} caractères {descPreview.length > 160 ? '(idéalement ≤ 160)' : ''}
          </span>
        </div>

        <div className="field">
          <label>Adresse de la page (slug)</label>
          <input value={slug} placeholder={effectiveSlug} onChange={(e) => setSlug(e.target.value)} />
          <span className="muted" style={{ fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>{publicUrl}</span>
        </div>

        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--text-sm)' }}>
          {seoChecks.map((c) => (
            <li key={c.label} style={{ color: c.ok ? 'var(--success, #15803d)' : 'var(--muted, #777)' }}>
              {c.ok ? '✓' : '•'} {c.label}
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="row-between">
        <div className="field" style={{ margin: 0 }}>
          <label>Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </div>
        {status === 'published' && (
          <label className="checkbox-inline" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            Notifier les accrédités par email
          </label>
        )}
        <div className="inline-actions">
          {initial && (
            <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy}>
              Supprimer
            </button>
          )}
          <button className="btn btn-primary" onClick={save} disabled={busy || !title}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
