import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { InfoBubble } from '../components/InfoBubble';
import type { Newsletter, Recipient } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="flex flex-col gap-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Communications</h2>
        {draft === null && (
          <Button size="sm" onClick={() => setDraft('new')}>
            Nouvelle newsletter
          </Button>
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

      {list.loading && <p className="text-muted-foreground">Chargement…</p>}
      {list.error && (
        <Alert variant="destructive">
          <AlertDescription>{list.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {list.data?.map((n) => (
          <Card key={n.id}>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{n.subject}</span>
                  {n.status === 'sent' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      Envoyée · {n.recipientCount} destinataires
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Brouillon</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {n.sentAt ? new Date(n.sentAt).toLocaleString('fr-FR') : 'Non envoyée'}
                </div>
              </div>
              {n.status === 'draft' && (
                <div className="flex flex-none gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(n)}>
                    Ouvrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeDraft(n)}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && !list.loading && (
          <p className="text-muted-foreground">Aucune communication.</p>
        )}
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{id ? 'Modifier la newsletter' : 'Nouvelle newsletter'}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}
        {msg && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="newsletter-subject">Objet de l’email</Label>
          <Input id="newsletter-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!bodyHtml.trim() || window.confirm('Remplacer le contenu actuel par le modèle ?')) {
                    setBodyHtml(STARTER_HTML);
                  }
                }}
              >
                Insérer un modèle
              </Button>
            </div>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={16}
              placeholder="<h1>Bonjour {{firstName}}</h1><p>…</p>"
              className="font-mono text-sm"
            />
            <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Variables : {'{{firstName}}'} et {'{{lastName}}'}. Le contenu est habillé aux couleurs de l’event.
              <InfoBubble title="Les variables">
                Ces étiquettes sont remplacées à l'envoi par les infos de chaque destinataire&nbsp;:{' '}
                <code>{'{{firstName}}'}</code> = prénom, <code>{'{{lastName}}'}</code> = nom. Écrivez-les
                exactement ainsi (avec les doubles accolades). Seules ces deux variables sont gérées pour les
                newsletters.
              </InfoBubble>
            </span>
          </div>
          <div className="grid gap-2">
            <Label>
              Aperçu <span className="font-normal text-muted-foreground">· valeurs d’exemple</span>
            </Label>
            <div
              className="overflow-auto rounded-md border bg-white p-4"
              style={{ minHeight: 200 }}
              dangerouslySetInnerHTML={{
                __html: (bodyHtml || '<p style="color:#999">Aperçu…</p>')
                  .replace(/\{\{\s*firstName\s*\}\}/g, 'Camille')
                  .replace(/\{\{\s*lastName\s*\}\}/g, 'Martin'),
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={saveDraft} disabled={busy || !subject}>
            Enregistrer le brouillon
          </Button>
          <Button onClick={openRecipients} disabled={busy || !subject || !bodyHtml}>
            Choisir les destinataires →
          </Button>
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
      </CardContent>
    </Card>
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
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col gap-4">
        <h3 className="text-base font-semibold">Destinataires</h3>
        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}
        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {result}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="only-accepted"
              checked={onlyAccepted}
              onCheckedChange={(v) => setOnlyAccepted(v === true)}
            />
            <Label htmlFor="only-accepted" className="font-normal">
              Accrédités acceptés uniquement
            </Label>
          </div>
          <InfoBubble title="Filtrer les destinataires">
            <strong>Coché</strong> : la liste ne montre que les journalistes dont l'accréditation est{' '}
            <strong>acceptée</strong> (le cas habituel). <strong>Décoché</strong> : elle inclut aussi les
            autres statuts (en attente, refusés) — à utiliser avec prudence pour ne pas écrire à des
            personnes non accréditées.
          </InfoBubble>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Tout sélectionner ({filtered.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>
            Aucun
          </Button>
        </div>

        <div className="flex max-h-[260px] flex-col gap-2 overflow-auto">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Checkbox
                  id={`recipient-${r.id}`}
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggle(r.id)}
                />
                <Label htmlFor={`recipient-${r.id}`} className="font-normal">
                  {r.firstName} {r.lastName ?? ''}{' '}
                  <span className="text-sm text-muted-foreground">{r.email}</span>
                </Label>
              </span>
              <span className="text-sm text-muted-foreground">{r.accStatus}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground">Aucun destinataire pour ce filtre.</p>
          )}
        </div>

        <Button onClick={send} disabled={busy || selected.size === 0}>
          {busy ? 'Envoi…' : `Envoyer à ${selected.size} destinataire(s)`}
        </Button>
      </CardContent>
    </Card>
  );
}
