import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { CopyLink } from '../components/CopyLink';
import { InfoBubble } from '../components/InfoBubble';
import { useToast } from '../components/Toast';
import { FileText } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { PressRelease } from '../lib/types';

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const willNotify = status === 'published' && notifyEmail;
      const payload = { title, bodyHtml, status, notifyEmail: willNotify };
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
        <div className="card" style={{ background: '#fff' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
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
