import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { CopyLink } from '../components/CopyLink';
import { PageHero } from '../components/PageHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EventSummary, Lang, Stage } from '../lib/types';

const ALL_LANGS: Lang[] = ['fr', 'en', 'pt', 'es'];
const LANG_LABEL: Record<Lang, string> = { fr: 'Français', en: 'Anglais', pt: 'Portugais', es: 'Espagnol' };

const STEPS = ['Informations', 'Apparence', 'Scènes & artistes', 'Règles', 'Clôture', 'Terminé'] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

const DEFAULT_CONFIG = {
  itwDurationMin: 15,
  itwBufferMin: 5,
  defaultItwQuota: 3,
  photoQuotaPerStage: 5,
  ageBonusPerHour: 1,
  ageBonusCap: 24,
};

export function EventWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepIndex>(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(next: StepIndex) {
    setError(null);
    setStep(next);
  }

  /** Exécute l'action (création / sauvegarde) d'une étape puis avance. */
  async function run(fn: () => Promise<void>, next: StepIndex) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setStep(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Nouvel événement"
        title="Créons votre événement"
        subtitle="Quelques étapes pour tout configurer — vous pourrez ajuster ensuite."
      />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium',
                  done || current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={cn('text-sm', current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:inline-block" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <Alert variant="destructive" className="max-w-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 0 && <InfosStep busy={busy} onNext={(fn) => run(fn, 1)} setEventId={setEventId} />}
      {step === 1 && eventId && (
        <BrandingStep eventId={eventId} busy={busy} onNext={(fn) => run(fn, 2)} onSkip={() => go(2)} onBack={() => go(0)} />
      )}
      {step === 2 && eventId && <LineupStep eventId={eventId} onContinue={() => go(3)} onBack={() => go(1)} />}
      {step === 3 && eventId && (
        <ConfigStep eventId={eventId} busy={busy} onNext={(fn) => run(fn, 4)} onSkip={() => go(4)} onBack={() => go(2)} />
      )}
      {step === 4 && eventId && (
        <DeadlineStep eventId={eventId} busy={busy} onNext={(fn) => run(fn, 5)} onSkip={() => go(5)} onBack={() => go(3)} />
      )}
      {step === 5 && eventId && <DoneStep eventId={eventId} onOpen={() => navigate(`/admin/events/${eventId}`)} />}
    </div>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function NavButtons({
  onBack,
  onSkip,
  onPrimary,
  busy,
  nextLabel = 'Continuer',
  canNext = true,
  submit = false,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  onPrimary?: () => void;
  busy?: boolean;
  nextLabel?: string;
  canNext?: boolean;
  submit?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy}>
            ← Retour
          </Button>
        )}
        {onSkip && (
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={busy}>
            Passer
          </Button>
        )}
      </div>
      <Button
        type={submit ? 'submit' : 'button'}
        onClick={submit ? undefined : onPrimary}
        disabled={busy || !canNext}
      >
        {busy ? 'Enregistrement…' : nextLabel}
      </Button>
    </div>
  );
}

function InfosStep({
  busy,
  onNext,
  setEventId,
}: {
  busy: boolean;
  onNext: (fn: () => Promise<void>) => void;
  setEventId: (id: string) => void;
}) {
  const api = useAuthedApi();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [langs, setLangs] = useState<Lang[]>(['fr']);

  function toggleLang(l: Lang) {
    setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onNext(async () => {
      const ev = await api.post<EventSummary>('/admin/events', {
        name,
        location: location || null,
        startDate: startDate || null,
        endDate: endDate || null,
        languages: langs,
      });
      setEventId(ev.id);
    });
  }

  return (
    <form onSubmit={submit}>
      <StepCard title="Informations de l'événement">
        <div className="grid gap-2">
          <Label htmlFor="ev-name">Nom de l'événement *</Label>
          <Input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ev-location">Lieu</Label>
            <Input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Dates</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
              <Input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Langues du formulaire public *</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((l) => (
              <Button
                type="button"
                key={l}
                size="sm"
                variant={langs.includes(l) ? 'default' : 'outline'}
                aria-pressed={langs.includes(l)}
                onClick={() => toggleLang(l)}
              >
                {LANG_LABEL[l]}
              </Button>
            ))}
          </div>
        </div>
        <NavButtons busy={busy} canNext={!!name && langs.length > 0} submit nextLabel="Créer & continuer" />
      </StepCard>
    </form>
  );
}

function BrandingStep({
  eventId,
  busy,
  onNext,
  onSkip,
  onBack,
}: {
  eventId: string;
  busy: boolean;
  onNext: (fn: () => Promise<void>) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const api = useAuthedApi();
  const [accentColor, setAccent] = useState('#4f46e5');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function save() {
    onNext(async () => {
      await api.put(`/admin/events/${eventId}/branding`, { accentColor, logoUrl });
    });
  }

  return (
    <StepCard title="Apparence des pages publiques">
      <p className="text-sm text-muted-foreground">
        Logo et couleur appliqués au formulaire d'accréditation, à la newsroom et aux emails.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="ev-accent">Couleur d'accent</Label>
        <input
          id="ev-accent"
          type="color"
          value={accentColor}
          onChange={(e) => setAccent(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-md border p-1"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-logo">Logo</Label>
        <Input
          id="ev-logo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {logoUrl && <img src={logoUrl} alt="" className="mt-2 max-h-14" />}
      </div>
      <NavButtons onBack={onBack} onSkip={onSkip} onPrimary={save} busy={busy} nextLabel="Enregistrer & continuer" />
    </StepCard>
  );
}

function LineupStep({ eventId, onContinue, onBack }: { eventId: string; onContinue: () => void; onBack: () => void }) {
  const api = useAuthedApi();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageName, setStageName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistStage, setArtistStage] = useState('');
  const [artistQuota, setArtistQuota] = useState('');
  const [artists, setArtists] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addStage() {
    if (!stageName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const s = await api.post<Stage>(`/admin/events/${eventId}/stages`, { name: stageName.trim() });
      setStages((cur) => [...cur, s]);
      setStageName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function addArtist() {
    if (!artistName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/events/${eventId}/artists`, {
        name: artistName.trim(),
        stageId: artistStage || null,
        itwQuota: artistQuota ? Number(artistQuota) : null,
      });
      setArtists((cur) => [...cur, artistName.trim()]);
      setArtistName('');
      setArtistQuota('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepCard title="Scènes & artistes">
      <p className="text-sm text-muted-foreground">
        Optionnel ici — vous pourrez compléter le lineup et les créneaux d'interview plus tard dans l'onglet dédié.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label>Scènes ({stages.length})</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="Nom de la scène"
            className="w-auto flex-1"
          />
          <Button variant="ghost" size="sm" onClick={addStage} disabled={busy || !stageName.trim()}>
            Ajouter
          </Button>
        </div>
        {stages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {stages.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Artistes ({artists.length})</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Nom de l'artiste" />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={artistStage} onValueChange={setArtistStage}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Scène (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={artistQuota}
              onChange={(e) => setArtistQuota(e.target.value)}
              placeholder="Quota itw"
              className="w-24"
            />
            <Button variant="ghost" size="sm" onClick={addArtist} disabled={busy || !artistName.trim()}>
              Ajouter
            </Button>
          </div>
        </div>
        {artists.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {artists.map((a, i) => (
              <Badge key={i} className="border-transparent bg-emerald-100 text-emerald-800">
                {a}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <NavButtons onBack={onBack} onSkip={onContinue} onPrimary={onContinue} busy={busy} nextLabel="Continuer" />
    </StepCard>
  );
}

function ConfigStep({
  eventId,
  busy,
  onNext,
  onSkip,
  onBack,
}: {
  eventId: string;
  busy: boolean;
  onNext: (fn: () => Promise<void>) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const api = useAuthedApi();
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);

  function set<K extends keyof typeof cfg>(k: K, v: number) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  function save() {
    onNext(async () => {
      await api.put(`/admin/events/${eventId}/config`, cfg);
    });
  }

  const fields: { key: keyof typeof cfg; label: string }[] = [
    { key: 'itwDurationMin', label: 'Durée interview (min)' },
    { key: 'itwBufferMin', label: 'Battement entre interviews (min)' },
    { key: 'defaultItwQuota', label: 'Quota interviews par artiste (défaut)' },
    { key: 'ageBonusPerHour', label: 'Bonus de score / heure d’ancienneté' },
    { key: 'ageBonusCap', label: 'Plafond du bonus d’ancienneté (h)' },
  ];

  return (
    <StepCard title="Règles & quotas">
      <p className="text-sm text-muted-foreground">
        Valeurs par défaut déjà appliquées à la création. Ajustez si besoin (modifiable à tout moment).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div className="grid gap-2" key={f.key}>
            <Label htmlFor={`cfg-${f.key}`}>{f.label}</Label>
            <Input
              id={`cfg-${f.key}`}
              type="number"
              min={0}
              value={cfg[f.key]}
              onChange={(e) => set(f.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      <NavButtons onBack={onBack} onSkip={onSkip} onPrimary={save} busy={busy} nextLabel="Enregistrer & continuer" />
    </StepCard>
  );
}

function DeadlineStep({
  eventId,
  busy,
  onNext,
  onSkip,
  onBack,
}: {
  eventId: string;
  busy: boolean;
  onNext: (fn: () => Promise<void>) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const api = useAuthedApi();
  const [value, setValue] = useState('');

  function save() {
    onNext(async () => {
      const iso = value ? new Date(value).toISOString() : null;
      await api.put(`/admin/events/${eventId}/deadline`, { accreditationDeadline: iso });
    });
  }

  return (
    <StepCard title="Clôture des inscriptions">
      <p className="text-sm text-muted-foreground">
        Au-delà de cette date, le formulaire d'accréditation affiche un compte à rebours puis se ferme.
        Laissez vide pour ne pas fixer de limite.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="ev-deadline">Date & heure de clôture</Label>
        <Input id="ev-deadline" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <NavButtons onBack={onBack} onSkip={onSkip} onPrimary={save} busy={busy} nextLabel="Enregistrer & continuer" />
    </StepCard>
  );
}

function DoneStep({ eventId, onOpen }: { eventId: string; onOpen: () => void }) {
  return (
    <StepCard title="Votre événement est prêt">
      <p className="text-sm text-muted-foreground">
        Partagez ce lien aux journalistes pour qu'ils demandent leur accréditation :
      </p>
      <CopyLink url={`${window.location.origin}/accreditation/${eventId}`} />
      <Button className="mt-2 self-start" onClick={onOpen}>
        Ouvrir le tableau de bord →
      </Button>
    </StepCard>
  );
}
