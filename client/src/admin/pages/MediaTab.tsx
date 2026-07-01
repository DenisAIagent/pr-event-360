import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { uploadToCloudinary } from '../lib/upload';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { AssetKind, EventAsset, UploadSignature } from '../lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const KINDS: { value: AssetKind; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
  { value: 'logo', label: 'Logo' },
  { value: 'press_kit', label: 'Dossier de presse' },
  { value: 'other', label: 'Autre' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<AssetKind, string>;

export function MediaTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<EventAsset[]>(
    () => apiAuthed.get<EventAsset[]>(`/admin/events/${eventId}/assets`),
    [eventId],
  );

  const [kind, setKind] = useState<AssetKind>('photo');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const sig = await apiAuthed.post<UploadSignature>(`/admin/events/${eventId}/assets/sign`);
      const up = await uploadToCloudinary(file, sig);
      await apiAuthed.post(`/admin/events/${eventId}/assets`, {
        kind,
        title: title || file.name,
        url: up.url,
        thumbnailUrl: up.thumbnailUrl,
        mime: up.mime,
        bytes: up.bytes,
        source: 'upload',
      });
      setMsg(`« ${title || file.name} » ajouté.`);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un média</CardTitle>
          <CardDescription>
            Photos, vidéos, logos et dossier de presse. Ils apparaîtront dans la newsroom publique.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="asset-kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as AssetKind)}>
                <SelectTrigger id="asset-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-title">Titre (optionnel)</Label>
              <Input
                id="asset-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nom du fichier par défaut"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              Choisir un fichier…
            </Button>
            {busy && <span className="text-sm text-muted-foreground">Upload en cours…</span>}
            <input
              ref={fileRef}
              type="file"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Médiathèque ({data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
            {data?.map((a) => (
              <AssetCard key={a.id} asset={a} kindLabel={KIND_LABEL[a.kind]} eventId={eventId} onDeleted={reload} />
            ))}
            {data?.length === 0 && !loading && (
              <EmptyState
                icon={ImageIcon}
                title="Aucun média pour l’instant"
                hint="Importez vos premières photos, vidéos et logos ci-dessus — les journalistes pourront les télécharger depuis la newsroom."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetCard({
  asset,
  kindLabel,
  eventId,
  onDeleted,
}: {
  asset: EventAsset;
  kindLabel: string;
  eventId: string;
  onDeleted: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/assets/${asset.id}`);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-2">
        <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-muted">
          {asset.thumbnailUrl ? (
            <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-muted-foreground">{kindLabel}</span>
          )}
        </div>
        <strong className="text-sm">{asset.title}</strong>
        <Badge variant="secondary" className="self-start">
          {kindLabel}
        </Badge>
        <div className="flex items-center gap-2">
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <a href={asset.url} target="_blank" rel="noreferrer">
              Ouvrir
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={del} disabled={busy}>
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
