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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <strong className="text-sm font-semibold">Newsroom publique</strong>
            <span className="text-sm text-muted-foreground">CP publiés + médias téléchargeables, à partager</span>
          </div>
          <CopyLink url={newsroomUrl} />
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Communiqués de presse</h2>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing('new')}>
            Nouveau communiqué
          </Button>
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

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {data?.map((pr) => (
          <Card key={pr.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-semibold">{pr.title}</strong>
                  <Badge
                    variant={pr.status === 'published' ? undefined : 'secondary'}
                    className={cn(pr.status === 'published' && 'border-transparent bg-emerald-100 text-emerald-800')}
                  >
                    {pr.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {pr.publishedAt ? new Date(pr.publishedAt).toLocaleDateString('fr-FR') : 'Non publié'}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(pr)}>
                Modifier
              </Button>
            </CardContent>
          </Card>
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
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{initial ? 'Modifier le communiqué' : 'Nouveau communiqué'}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-2">
          <Label htmlFor="cp-title">Titre</Label>
          <Input id="cp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Label htmlFor="cp-body">Contenu (HTML)</Label>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!bodyHtml.trim() || window.confirm('Remplacer le contenu actuel par le modèle ?')) {
                  setBodyHtml(CP_STARTER_HTML);
                }
              }}
            >
              Insérer un modèle
            </Button>
          </div>
          <Textarea
            id="cp-body"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label>Aperçu</Label>
          {coverImageUrl && (
            <img src={coverImageUrl} alt="" className="mb-2.5 max-h-56 w-full rounded-md object-cover" />
          )}
          <div className="rounded-md border bg-white p-4" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-1.5">
              <h4 className="text-base font-semibold">Référencement & partage (SEO)</h4>
              <InfoBubble title="Pourquoi c’est important">
                Ces réglages soignent l’apparence du communiqué sur <strong>Google</strong> et dans les
                <strong> aperçus partagés</strong> (LinkedIn, X, Facebook, WhatsApp). Renseignés par défaut, ils
                sont modifiables.
              </InfoBubble>
            </div>

            <div className="grid gap-2">
              <Label>Image de couverture (illustration + aperçu social)</Label>
              <div className="flex flex-wrap items-center gap-3">
                {coverImageUrl && (
                  <img src={coverImageUrl} alt="" className="h-14 w-24 rounded-md object-cover" />
                )}
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="w-auto flex-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadCover(f);
                  }}
                />
                {uploadBusy && <span className="text-sm text-muted-foreground">Upload…</span>}
                {coverImageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCoverImageUrl(null)}>
                    Retirer
                  </Button>
                )}
              </div>
              <Input
                placeholder="…ou collez une URL d’image (https://)"
                value={coverImageUrl ?? ''}
                onChange={(e) => setCoverImageUrl(e.target.value || null)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cp-seo-desc">Description SEO (extrait affiché sur Google / aperçus)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSeoDescription(htmlToText(bodyHtml).slice(0, 155))}
                >
                  Générer depuis le contenu
                </Button>
              </div>
              <Textarea
                id="cp-seo-desc"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
              />
              <span className="text-sm text-muted-foreground">
                {descPreview.length} caractères {descPreview.length > 160 ? '(idéalement ≤ 160)' : ''}
              </span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cp-slug">Adresse de la page (slug)</Label>
              <Input id="cp-slug" value={slug} placeholder={effectiveSlug} onChange={(e) => setSlug(e.target.value)} />
              <span className="text-sm break-all text-muted-foreground">{publicUrl}</span>
            </div>

            <ul className="m-0 flex list-none flex-col gap-4 p-0 text-sm">
              {seoChecks.map((c) => (
                <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-muted-foreground'}>
                  {c.ok ? '✓' : '•'} {c.label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="cp-status"
              checked={status === 'published'}
              onCheckedChange={(v) => setStatus(v ? 'published' : 'draft')}
            />
            <Label htmlFor="cp-status">{status === 'published' ? 'Publié' : 'Brouillon'}</Label>
          </div>
          {status === 'published' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notifyEmail} onCheckedChange={(v) => setNotifyEmail(v === true)} />
              Notifier les accrédités par email
            </label>
          )}
          <div className="flex items-center gap-2">
            {initial && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
                Supprimer
              </Button>
            )}
            <Button onClick={save} disabled={busy || !title}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
