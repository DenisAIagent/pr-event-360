import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { AdminBar } from '../components/AdminBar';
import { CopyLink } from '../components/CopyLink';
import { PageHero } from '../components/PageHero';
import { Icon } from '../../components/Icon';
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
    <div className="admin">
      <AdminBar />
      <div className="admin-shell">
        <PageHero
          eyebrow="Nouvel événement"
          title="Créons votre événement"
          subtitle="Quelques étapes pour tout configurer — vous pourrez ajuster ensuite."
        />
        <ol className="wizard-steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
              <span className="wizard-step-num">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </li>
          ))}
        </ol>

        {error && <div className="banner banner-error" style={{ maxWidth: 680 }}>{error}</div>}

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
    </div>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card stack" style={{ maxWidth: 680 }}>
      <h2 style={{ fontSize: 'var(--text-lg)' }}>{title}</h2>
      {children}
    </section>
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
    <div className="row-between" style={{ marginTop: 'var(--space-2)' }}>
      <div className="inline-actions">
        {onBack && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} disabled={busy}>
            ← Retour
          </button>
        )}
        {onSkip && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip} disabled={busy}>
            Passer
          </button>
        )}
      </div>
      <button
        type={submit ? 'submit' : 'button'}
        className="btn btn-primary"
        onClick={submit ? undefined : onPrimary}
        disabled={busy || !canNext}
      >
        {busy ? 'Enregistrement…' : nextLabel}
      </button>
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
        <div className="field">
          <label>Nom de l'événement *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Lieu</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="field">
            <label>Dates</label>
            <div className="grid-2">
              <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
              <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="field">
          <label>Langues du formulaire public *</label>
          <div className="inline-actions">
            {ALL_LANGS.map((l) => (
              <button type="button" key={l} className="chip" aria-pressed={langs.includes(l)} onClick={() => toggleLang(l)}>
                {LANG_LABEL[l]}
              </button>
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
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Logo et couleur appliqués au formulaire d'accréditation, à la newsroom et aux emails.
      </p>
      <div className="field">
        <label>Couleur d'accent</label>
        <input
          type="color"
          value={accentColor}
          onChange={(e) => setAccent(e.target.value)}
          style={{ width: 64, height: 40, padding: 2 }}
        />
      </div>
      <div className="field">
        <label>Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 56, marginTop: 8 }} />}
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
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Optionnel ici — vous pourrez compléter le lineup et les créneaux d'interview plus tard dans l'onglet dédié.
      </p>
      {error && <div className="banner banner-error">{error}</div>}

      <div className="field">
        <label>Scènes ({stages.length})</label>
        <div className="inline-actions">
          <input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Nom de la scène" />
          <button className="btn btn-ghost btn-sm" onClick={addStage} disabled={busy || !stageName.trim()}>
            Ajouter
          </button>
        </div>
        {stages.length > 0 && (
          <div className="inline-actions" style={{ marginTop: 8 }}>
            {stages.map((s) => (
              <span key={s.id} className="badge badge-progress">{s.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>Artistes ({artists.length})</label>
        <div className="grid-2">
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Nom de l'artiste" />
          <div className="inline-actions">
            <select value={artistStage} onChange={(e) => setArtistStage(e.target.value)}>
              <option value="">Scène (optionnel)</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={artistQuota}
              onChange={(e) => setArtistQuota(e.target.value)}
              placeholder="Quota itw"
              style={{ width: 100 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={addArtist} disabled={busy || !artistName.trim()}>
              Ajouter
            </button>
          </div>
        </div>
        {artists.length > 0 && (
          <div className="inline-actions" style={{ marginTop: 8 }}>
            {artists.map((a, i) => (
              <span key={i} className="badge badge-success">{a}</span>
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
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Valeurs par défaut déjà appliquées à la création. Ajustez si besoin (modifiable à tout moment).
      </p>
      <div className="grid-2">
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input type="number" min={0} value={cfg[f.key]} onChange={(e) => set(f.key, Number(e.target.value))} />
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
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Au-delà de cette date, le formulaire d'accréditation affiche un compte à rebours puis se ferme.
        Laissez vide pour ne pas fixer de limite.
      </p>
      <div className="field">
        <label>Date & heure de clôture</label>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <NavButtons onBack={onBack} onSkip={onSkip} onPrimary={save} busy={busy} nextLabel="Enregistrer & continuer" />
    </StepCard>
  );
}

function DoneStep({ eventId, onOpen }: { eventId: string; onOpen: () => void }) {
  return (
    <StepCard title="Votre événement est prêt">
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Partagez ce lien aux journalistes pour qu'ils demandent leur accréditation :
      </p>
      <CopyLink url={`${window.location.origin}/accreditation/${eventId}`} />
      <button className="btn btn-primary" onClick={onOpen} style={{ marginTop: 'var(--space-3)' }}>
        Ouvrir le tableau de bord →
      </button>
    </StepCard>
  );
}
