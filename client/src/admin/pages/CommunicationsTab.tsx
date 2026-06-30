import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { InfoBubble } from '../components/InfoBubble';
import type { Newsletter, Recipient } from '../lib/types';

/** Modèle de départ prêt à personnaliser (pour les non-techniciens). */
const STARTER_HTML = `<h1>Bonjour {{firstName}},</h1>
<p>Merci de votre intérêt pour notre événement.</p>
<p>Écrivez votre message ici. Vous pouvez mettre du texte <strong>en gras</strong>, ajouter un <a href="https://exemple.com">lien</a>, ou une liste :</p>
<ul>
  <li>Premier point</li>
  <li>Deuxième point</li>
</ul>
<p>À très vite,<br />L'équipe presse</p>`;

export function CommunicationsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const list = useFetch<Newsletter[]>(
    () => apiAuthed.get<Newsletter[]>(`/admin/events/${eventId}/newsletters`),
    [eventId],
  );
  const [draft, setDraft] = useState<Newsletter | 'new' | null>(null);

  async function removeDraft(n: Newsletter) {
    if (!(await confirm({ message: `Supprimer le brouillon « ${n.subject || 'Sans objet'} » ? Cette action est irréversible.`, confirmLabel: 'Supprimer', danger: true }))) {
      return;
    }
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/newsletters/${n.id}`);
      toast.success('Brouillon supprimé.');
      if (draft !== null && draft !== 'new' && draft.id === n.id) setDraft(null);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Communications</h2>
        {draft === null && (
          <button className="btn btn-primary btn-sm" onClick={() => setDraft('new')}>
            Nouvelle newsletter
          </button>
        )}
      </div>

      {draft !== null && (
        <Composer
          eventId={eventId}
          initial={draft === 'new' ? null : draft}
          onClose={() => setDraft(null)}
          onChanged={() => list.reload()}
        />
      )}

      {list.loading && <p className="muted">Chargement…</p>}
      {list.error && <div className="banner banner-error">{list.error}</div>}

      <div className="stack">
        {list.data?.map((n) => (
          <div key={n.id} className="card row-between">
            <div>
              <strong>{n.subject}</strong>
              <span
                className={`badge ${n.status === 'sent' ? 'badge-success' : 'badge-warn'}`}
                style={{ marginLeft: 8 }}
              >
                {n.status === 'sent' ? `Envoyée · ${n.recipientCount} destinataires` : 'Brouillon'}
              </span>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {n.sentAt ? new Date(n.sentAt).toLocaleString('fr-FR') : 'Non envoyée'}
              </div>
            </div>
            {n.status === 'draft' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flex: 'none' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setDraft(n)}>
                  Ouvrir
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeDraft(n)}
                  style={{ color: 'var(--color-danger)' }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
        {list.data?.length === 0 && !list.loading && <p className="muted">Aucune communication.</p>}
      </div>
    </div>
  );
}

function Composer({
  eventId,
  initial,
  onClose,
  onChanged,
}: {
  eventId: string;
  initial: Newsletter | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);

  async function saveDraft(): Promise<string | null> {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = { subject, bodyHtml };
      let nid = id;
      if (id) await apiAuthed.put(`/admin/events/${eventId}/newsletters/${id}`, payload);
      else {
        const created = await apiAuthed.post<Newsletter>(`/admin/events/${eventId}/newsletters`, payload);
        nid = created.id;
        setId(created.id);
      }
      setMsg('Brouillon enregistré.');
      onChanged();
      return nid;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openRecipients() {
    const nid = await saveDraft();
    if (nid) setShowRecipients(true);
  }

  return (
    <div className="card stack">
      <div className="row-between">
        <h3 style={{ fontSize: 'var(--text-lg)' }}>{id ? 'Modifier la newsletter' : 'Nouvelle newsletter'}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
      {err && <div className="banner banner-error">{err}</div>}
      {msg && <div className="banner banner-success">{msg}</div>}

      <div className="field">
        <label>Objet de l’email</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Contenu HTML
              <InfoBubble title="Écrire le contenu (HTML)">
                Le contenu s'écrit en <strong>HTML</strong> (des balises). Les bases&nbsp;:
                <ul>
                  <li>Titre : <code>{'<h1>Mon titre</h1>'}</code></li>
                  <li>Paragraphe : <code>{'<p>Mon texte</p>'}</code></li>
                  <li>Gras : <code>{'<strong>important</strong>'}</code></li>
                  <li>Lien : <code>{'<a href="https://…">cliquez ici</a>'}</code></li>
                  <li>Liste : <code>{'<ul><li>élément</li></ul>'}</code></li>
                </ul>
                Pas à l'aise ? Cliquez <strong>« Insérer un modèle »</strong> et remplacez le texte.
                L'aperçu à droite montre le rendu réel.
              </InfoBubble>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (!bodyHtml.trim() || window.confirm('Remplacer le contenu actuel par le modèle ?')) {
                  setBodyHtml(STARTER_HTML);
                }
              }}
            >
              Insérer un modèle
            </button>
          </label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={16}
            placeholder="<h1>Bonjour {{firstName}}</h1><p>…</p>"
            style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}
          />
          <span className="field-hint muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            Variables : {'{{firstName}}'} et {'{{lastName}}'}. Le contenu est habillé aux couleurs de l’event.
            <InfoBubble title="Les variables">
              Ces étiquettes sont remplacées à l'envoi par les infos de chaque destinataire&nbsp;:{' '}
              <code>{'{{firstName}}'}</code> = prénom, <code>{'{{lastName}}'}</code> = nom. Écrivez-les
              exactement ainsi (avec les doubles accolades). Seules ces deux variables sont gérées pour les
              newsletters.
            </InfoBubble>
          </span>
        </div>
        <div className="field">
          <label>Aperçu <span className="muted" style={{ fontWeight: 400 }}>· valeurs d’exemple</span></label>
          <div
            className="card"
            style={{ background: '#fff', minHeight: 200, overflow: 'auto' }}
            dangerouslySetInnerHTML={{
              __html: (bodyHtml || '<p style="color:#999">Aperçu…</p>')
                .replace(/\{\{\s*firstName\s*\}\}/g, 'Camille')
                .replace(/\{\{\s*lastName\s*\}\}/g, 'Martin'),
            }}
          />
        </div>
      </div>

      <div className="inline-actions">
        <button className="btn btn-ghost" onClick={saveDraft} disabled={busy || !subject}>
          Enregistrer le brouillon
        </button>
        <button className="btn btn-primary" onClick={openRecipients} disabled={busy || !subject || !bodyHtml}>
          Choisir les destinataires →
        </button>
      </div>

      {showRecipients && id && (
        <RecipientPicker
          eventId={eventId}
          newsletterId={id}
          onSent={() => {
            setShowRecipients(false);
            onChanged();
            onClose();
          }}
        />
      )}
    </div>
  );
}

function RecipientPicker({
  eventId,
  newsletterId,
  onSent,
}: {
  eventId: string;
  newsletterId: string;
  onSent: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const { data } = useFetch<Recipient[]>(
    () => apiAuthed.get<Recipient[]>(`/admin/events/${eventId}/recipients`),
    [eventId],
  );
  const [onlyAccepted, setOnlyAccepted] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const filtered = useMemo(
    () => (data ?? []).filter((r) => r.email && (!onlyAccepted || r.accStatus === 'acceptee')),
    [data, onlyAccepted],
  );

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.id)));
  }
  function clear() {
    setSelected(new Set());
  }

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const journalistIds = filtered.filter((r) => selected.has(r.id)).map((r) => r.id);
      const res = await apiAuthed.post<{ sent: number; failed: number; total: number }>(
        `/admin/events/${eventId}/newsletters/${newsletterId}/send`,
        { journalistIds },
      );
      setResult(`Envoyée : ${res.sent} réussi(s), ${res.failed} échec(s) sur ${res.total}.`);
      setTimeout(onSent, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack" style={{ background: 'var(--color-accent-tint, #f5f5ff)' }}>
      <h3 style={{ fontSize: 'var(--text-lg)' }}>Destinataires</h3>
      {err && <div className="banner banner-error">{err}</div>}
      {result && <div className="banner banner-success">{result}</div>}
      <div className="inline-actions">
        <label className="inline-actions" style={{ gap: 6 }}>
          <input type="checkbox" checked={onlyAccepted} onChange={(e) => setOnlyAccepted(e.target.checked)} />
          Accrédités acceptés uniquement
        </label>
        <InfoBubble title="Filtrer les destinataires">
          <strong>Coché</strong> : la liste ne montre que les journalistes dont l'accréditation est{' '}
          <strong>acceptée</strong> (le cas habituel). <strong>Décoché</strong> : elle inclut aussi les
          autres statuts (en attente, refusés) — à utiliser avec prudence pour ne pas écrire à des
          personnes non accréditées.
        </InfoBubble>
        <button className="btn btn-ghost btn-sm" onClick={selectAll}>
          Tout sélectionner ({filtered.length})
        </button>
        <button className="btn btn-ghost btn-sm" onClick={clear}>
          Aucun
        </button>
      </div>

      <div className="stack" style={{ maxHeight: 260, overflow: 'auto' }}>
        {filtered.map((r) => (
          <label key={r.id} className="row-between" style={{ gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
              {r.firstName} {r.lastName ?? ''}{' '}
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{r.email}</span>
            </span>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{r.accStatus}</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="muted">Aucun destinataire pour ce filtre.</p>}
      </div>

      <button className="btn btn-primary" onClick={send} disabled={busy || selected.size === 0}>
        {busy ? 'Envoi…' : `Envoyer à ${selected.size} destinataire(s)`}
      </button>
    </div>
  );
}
