import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import type { ArtistWithSlots, EventSettings, Lineup, Stage } from '../lib/types';
import {
  ConfigForm,
  TypeWeights,
  MediaTypes,
  DeadlineCard,
  RecapCard,
  Templates,
} from '../components/settings/SettingsCards';
import { BrandingEditor } from '../components/settings/BrandingEditor';
import { SubdomainCard } from '../components/settings/SubdomainCard';
import { DomainCard } from '../components/settings/DomainCard';
import { InfoBubble } from '../components/InfoBubble';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STEPS = ['Scènes', 'Artistes', 'Règles & quotas', 'Apparence', 'Sous-domaine', 'Clôture', 'Récap & emails'];

// Valeur sentinelle pour l'option « sans scène » : Radix Select interdit une value
// vide. On mappe vers/depuis la chaîne vide pour conserver le state d'origine.
const NO_STAGE = '__none__';

interface WindowDraft {
  day: string;
  startTime: string;
  endTime: string;
}

export function LineupTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<Lineup>(
    () => apiAuthed.get<Lineup>(`/admin/events/${eventId}/lineup`),
    [eventId],
  );

  // Wizard de configuration en 6 étapes : Scènes → Artistes → Règles → Apparence
  // → Clôture → Récap. Un événement qui a déjà des scènes démarre à « Artistes ».
  const [step, setStep] = useState(0);
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current && data) {
      initRef.current = true;
      if (data.stages.length > 0) setStep(1);
    }
  }, [data]);

  // Réglages réutilisés aux étapes 3-6 (mêmes cartes que l'onglet Réglages).
  const settings = useFetch<EventSettings>(
    () => apiAuthed.get<EventSettings>(`/admin/events/${eventId}/settings`),
    [eventId],
  );
  const ev = useFetch<{ name: string }>(
    () => apiAuthed.get<{ name: string }>(`/admin/events/${eventId}`),
    [eventId],
  );

  const [stageName, setStageName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistStage, setArtistStage] = useState('');
  const [artistQuota, setArtistQuota] = useState('');
  const [artistPhotoQuota, setArtistPhotoQuota] = useState('');
  const [artistVideoQuota, setArtistVideoQuota] = useState('');
  const [windows, setWindows] = useState<WindowDraft[]>([{ day: '', startTime: '', endTime: '' }]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!stageName) return;
    await apiAuthed.post(`/admin/events/${eventId}/stages`, { name: stageName });
    setStageName('');
    reload();
  }

  function setWindow(i: number, patch: Partial<WindowDraft>) {
    setWindows((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  async function addArtist(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const validWindows = windows.filter((w) => w.day && w.startTime && w.endTime);
      await apiAuthed.post(`/admin/events/${eventId}/artists`, {
        name: artistName,
        stageId: artistStage || null,
        itwQuota: artistQuota ? Number(artistQuota) : null,
        photoQuota: artistPhotoQuota ? Number(artistPhotoQuota) : null,
        videoQuota: artistVideoQuota ? Number(artistVideoQuota) : null,
        windows: validWindows,
      });
      setArtistName('');
      setArtistStage('');
      setArtistQuota('');
      setArtistPhotoQuota('');
      setArtistVideoQuota('');
      setWindows([{ day: '', startTime: '', endTime: '' }]);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  const stages = data?.stages ?? [];
  const artists = data?.artists ?? [];
  const unassigned = artists.filter((a) => !a.stageId);
  const noStage = stages.length === 0;

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      {/* Stepper de configuration : 6 étapes cliquables */}
      <ol className="flex flex-wrap gap-1">
        {STEPS.map((label, i) => {
          const state = i === step ? 'current' : i < step ? 'done' : 'upcoming';
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  state === 'current' && 'bg-primary text-primary-foreground',
                  state === 'done' && 'text-foreground hover:bg-accent',
                  state === 'upcoming' && 'text-muted-foreground hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-xs',
                    state === 'current'
                      ? 'bg-primary-foreground text-primary'
                      : state === 'done'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {i < step ? <Check size={13} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 1 — créez vos scènes, une à une. Vous pourrez toujours en ajouter ou les corriger plus tard.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scènes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <form className="flex flex-wrap items-center gap-2" onSubmit={addStage}>
                <Input
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Nom de la scène"
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" type="submit">
                  Ajouter la scène
                </Button>
              </form>
              <div className="flex flex-col items-start gap-2">
                {stages.map((s) => (
                  <StageRow key={s.id} stage={s} eventId={eventId} onChanged={reload} />
                ))}
                {noStage && <span className="text-sm text-muted-foreground">Aucune scène pour l’instant.</span>}
              </div>
            </CardContent>
          </Card>
          {!noStage && (
            <p className="text-sm text-muted-foreground">
              {`${stages.length} scène${stages.length > 1 ? 's' : ''} créée${stages.length > 1 ? 's' : ''}.`} Cliquez
              « Suivant » pour passer aux artistes.
            </p>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 2 — ajoutez vos artistes et rattachez chacun à une scène.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajouter un artiste</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={addArtist}>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="artist-name">Nom *</Label>
                  <Input
                    id="artist-name"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="artist-stage">Scène</Label>
                    <Select
                      value={artistStage || NO_STAGE}
                      onValueChange={(v) => setArtistStage(v === NO_STAGE ? '' : v)}
                    >
                      <SelectTrigger id="artist-stage" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_STAGE}>— Sans scène</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="artist-quota" className="inline-flex items-center gap-1.5">
                      Quota interviews (sinon défaut)
                      <InfoBubble>
                        Nombre maximum d'interviews pour cet artiste. Laissez <strong>vide</strong> pour
                        utiliser la valeur par défaut définie à l'étape « Règles & quotas ».
                      </InfoBubble>
                    </Label>
                    <Input
                      id="artist-quota"
                      type="number"
                      min={0}
                      value={artistQuota}
                      onChange={(e) => setArtistQuota(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="artist-photo" className="inline-flex items-center gap-1.5">
                      Quota photographes
                      <InfoBubble title="Photographes « dans le pit »">
                        Le <strong>« pit »</strong> est la zone réservée aux photographes juste devant la
                        scène. Ce quota limite le nombre de photographes acceptés pour cet artiste. Laissez
                        vide = illimité.
                      </InfoBubble>
                    </Label>
                    <Input
                      id="artist-photo"
                      type="number"
                      min={0}
                      value={artistPhotoQuota}
                      onChange={(e) => setArtistPhotoQuota(e.target.value)}
                      placeholder="illimité"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="artist-video">Quota vidéastes</Label>
                    <Input
                      id="artist-video"
                      type="number"
                      min={0}
                      value={artistVideoQuota}
                      onChange={(e) => setArtistVideoQuota(e.target.value)}
                      placeholder="illimité"
                    />
                  </div>
                </div>
                <p className="-mt-2 text-sm text-muted-foreground">
                  Quotas propres à l’artiste (interviews, photographes dans le pit, vidéastes).
                  Laisser vide = <strong>illimité</strong>. Au-delà du quota, les demandes passent en liste d’attente.
                </p>
                <div className="grid gap-2">
                  <Label className="inline-flex items-center gap-1.5">
                    Tranches de disponibilité → créneaux générés
                    <InfoBubble title="Comment les créneaux sont créés">
                      Indiquez les plages où l'artiste est disponible pour des interviews. L'app y crée
                      <strong> automatiquement</strong> les créneaux, selon la <em>durée</em> et le{' '}
                      <em>battement</em> définis à l'étape « Règles & quotas ».
                      <br />
                      Ex : plage 14:00–15:00, durée 15 min + 5 min de pause → créneaux 14:00, 14:20, 14:40.
                    </InfoBubble>
                  </Label>
                  {windows.map((w, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        className="w-auto"
                        value={w.day}
                        onChange={(e) => setWindow(i, { day: e.target.value })}
                      />
                      <Input
                        type="time"
                        className="w-auto"
                        value={w.startTime}
                        onChange={(e) => setWindow(i, { startTime: e.target.value })}
                      />
                      <Input
                        type="time"
                        className="w-auto"
                        value={w.endTime}
                        onChange={(e) => setWindow(i, { endTime: e.target.value })}
                      />
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWindows((ws) => [...ws, { day: '', startTime: '', endTime: '' }])}
                    >
                      + Tranche
                    </Button>
                  </div>
                </div>
                <div>
                  <Button type="submit" disabled={busy || !artistName}>
                    {busy ? 'Ajout…' : "Ajouter l'artiste"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-4">
            <h3 className="text-base font-semibold">Lineup ({artists.length})</h3>
            {artists.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun artiste — ajoutez-en un ci-dessus pour gérer les demandes d’interview.
              </p>
            )}
            {stages.map((stage) => {
              const arts = artists.filter((a) => a.stageId === stage.id);
              return (
                <div key={stage.id}>
                  <h4 className="mb-2 text-sm font-semibold">
                    {stage.name}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {arts.length} artiste{arts.length > 1 ? 's' : ''}
                    </span>
                  </h4>
                  {arts.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucun artiste sur cette scène.</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {arts.map((a) => (
                        <ArtistRow key={a.id} artist={a} stages={stages} eventId={eventId} onChanged={reload} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {unassigned.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Sans scène · {unassigned.length} artiste{unassigned.length > 1 ? 's' : ''}
                </h4>
                <div className="flex flex-col gap-2">
                  {unassigned.map((a) => (
                    <ArtistRow key={a.id} artist={a} stages={stages} eventId={eventId} onChanged={reload} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 3 — réglez les règles de priorité : durée des interviews, quota interviews par défaut,
            multiplicateurs par type et poids des médias (servent au score des demandes).
          </p>
          {settings.data ? (
            <>
              <ConfigForm eventId={eventId} config={settings.data.config} />
              <TypeWeights eventId={eventId} weights={settings.data.typeWeights} onSaved={settings.reload} />
              <MediaTypes eventId={eventId} mediaTypes={settings.data.mediaTypes} onSaved={settings.reload} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 4 — habillez vos pages publiques (logo, image de fond, couleurs) avec un aperçu en direct.
          </p>
          {settings.data ? (
            <BrandingEditor
              eventId={eventId}
              initial={settings.data.branding}
              eventName={ev.data?.name ?? 'Événement'}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 5 — l'adresse publique de l'événement : un sous-domaine prêt à l'emploi, et/ou votre
            propre nom de domaine (optionnel).
          </p>
          <SubdomainCard eventId={eventId} />
          <DomainCard eventId={eventId} />
        </>
      )}

      {step === 5 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 6 — fixez la date limite d'inscription (optionnel) ; un compte à rebours s'affiche côté public.
          </p>
          <DeadlineCard eventId={eventId} />
        </>
      )}

      {step === 6 && (
        <>
          <p className="text-sm text-muted-foreground">
            Étape 7 — récapitulatifs envoyés à l'équipe et personnalisation des modèles d'emails (optionnel).
          </p>
          {settings.data ? (
            <>
              <RecapCard eventId={eventId} initial={settings.data.recap} onSaved={settings.reload} />
              <Templates eventId={eventId} templates={settings.data.templates} onSaved={settings.reload} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong>Votre événement est prêt.</strong>{' '}
            <span className="text-emerald-800">
              Partagez le lien d'inscription (en haut de cette page) avec les journalistes.
            </span>
          </div>
        </>
      )}

      {/* Navigation entre étapes */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={18} /> {STEPS[step - 1]}
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Suivant : {STEPS[step + 1]} <ArrowRight size={18} />
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Configuration terminée.</span>
        )}
      </div>
    </div>
  );
}

/** Scène : affichage + renommage / suppression en cas d'erreur de saisie. */
function StageRow({ stage, eventId, onChanged }: { stage: Stage; eventId: string; onChanged: () => void }) {
  const api = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/stages/${stage.id}`, { name: name.trim() });
      toast.success('Scène renommée.');
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm({ message: `Supprimer la scène « ${stage.name} » ? Les artistes rattachés seront dé-rattachés.`, confirmLabel: 'Supprimer', danger: true }))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/events/${eventId}/stages/${stage.id}`);
      toast.success('Scène supprimée.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex w-full items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="flex-1" />
        <Button size="sm" onClick={save} disabled={busy || !name.trim()}>
          OK
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName(stage.name); }} disabled={busy}>
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm">
      <span className="font-medium">{stage.name}</span>
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Renommer
      </Button>
      <Button variant="ghost" size="sm" onClick={remove} disabled={busy} className="text-destructive hover:text-destructive">
        Supprimer
      </Button>
    </div>
  );
}

/** Artiste : affichage + correction (nom, scène, quota) / suppression. */
function ArtistRow({
  artist,
  stages,
  eventId,
  onChanged,
}: {
  artist: ArtistWithSlots;
  stages: Stage[];
  eventId: string;
  onChanged: () => void;
}) {
  const api = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(artist.name);
  const [stageId, setStageId] = useState(artist.stageId ?? '');
  const [quota, setQuota] = useState(artist.itwQuota != null ? String(artist.itwQuota) : '');
  const [photoQuota, setPhotoQuota] = useState(artist.photoQuota != null ? String(artist.photoQuota) : '');
  const [videoQuota, setVideoQuota] = useState(artist.videoQuota != null ? String(artist.videoQuota) : '');
  const [busy, setBusy] = useState(false);

  const stageName = stages.find((s) => s.id === artist.stageId)?.name ?? '—';
  const fmt = (n: number | null) => (n != null ? n : '∞');

  function resetDraft() {
    setName(artist.name);
    setStageId(artist.stageId ?? '');
    setQuota(artist.itwQuota != null ? String(artist.itwQuota) : '');
    setPhotoQuota(artist.photoQuota != null ? String(artist.photoQuota) : '');
    setVideoQuota(artist.videoQuota != null ? String(artist.videoQuota) : '');
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/artists/${artist.id}`, {
        name: name.trim(),
        stageId: stageId || null,
        itwQuota: quota ? Number(quota) : null,
        photoQuota: photoQuota ? Number(photoQuota) : null,
        videoQuota: videoQuota ? Number(videoQuota) : null,
      });
      toast.success('Artiste mis à jour.');
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm({ message: `Supprimer « ${artist.name} » et ses créneaux ?`, confirmLabel: 'Supprimer', danger: true }))) return;
    setBusy(true);
    try {
      await api.delete(`/admin/events/${eventId}/artists/${artist.id}`);
      toast.success('Artiste supprimé.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`artist-edit-name-${artist.id}`}>Nom</Label>
            <Input
              id={`artist-edit-name-${artist.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`artist-edit-stage-${artist.id}`}>Scène</Label>
              <Select
                value={stageId || NO_STAGE}
                onValueChange={(v) => setStageId(v === NO_STAGE ? '' : v)}
              >
                <SelectTrigger id={`artist-edit-stage-${artist.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAGE}>—</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`artist-edit-quota-${artist.id}`}>Quota interviews</Label>
              <Input
                id={`artist-edit-quota-${artist.id}`}
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                placeholder="défaut"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`artist-edit-photo-${artist.id}`}>Quota photographes</Label>
              <Input
                id={`artist-edit-photo-${artist.id}`}
                type="number"
                min={0}
                value={photoQuota}
                onChange={(e) => setPhotoQuota(e.target.value)}
                placeholder="illimité"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`artist-edit-video-${artist.id}`}>Quota vidéastes</Label>
              <Input
                id={`artist-edit-video-${artist.id}`}
                type="number"
                min={0}
                value={videoQuota}
                onChange={(e) => setVideoQuota(e.target.value)}
                placeholder="illimité"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={save} disabled={busy || !name.trim()}>
              Enregistrer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); resetDraft(); }} disabled={busy}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <strong>{artist.name}</strong>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{stageName}</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy} className="text-destructive hover:text-destructive">
              Supprimer
            </Button>
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Quotas — interviews : {artist.itwQuota ?? 'défaut'} · photo : {fmt(artist.photoQuota)} · vidéo : {fmt(artist.videoQuota)}
        </div>
        {artist.slots.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Aucun créneau (ajoutez des tranches de disponibilité).
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {artist.slots.map((s) => (
              <Badge key={s.id} variant="secondary" className="font-normal">
                {s.day} · {s.startTime.slice(0, 5)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
