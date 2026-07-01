import { useEffect, useState, type ReactNode } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventConfig, EventSettings, EmailTemplate, EventRecap, RecapFrequency } from '../../lib/types';
import { TRIGGER_LABEL, TYPE_LABEL } from '../../lib/labels';
import { Icon } from '../../../components/Icon';
import { InfoBubble } from '../InfoBubble';

/** Bloc d'explication réutilisable du score de priorité (concept central, opaque). */
const SCORE_HELP = (
  <>
    Le <strong>score</strong> classe les demandes quand il y en a plus que de places. Il est calculé
    automatiquement&nbsp;:
    <br />
    <code>poids du média × multiplicateur du type + bonus d'ancienneté</code>.
    <br />
    Plus le score est haut, plus la demande est traitée en premier. Les réglages ci-dessous le pilotent.
  </>
);

// ── Clôture des inscriptions ────────────────────────────────────────
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeadlineCard({ eventId }: { eventId: string }) {
  const apiAuthed = useAuthedApi();
  const { data, reload } = useFetch<{ accreditationDeadline: string | null }>(
    () => apiAuthed.get(`/admin/events/${eventId}`),
    [eventId],
  );
  const [value, setValue] = useState<string>('');
  const [saved, setSaved] = useState(false);
  useEffect(() => setValue(toLocalInput(data?.accreditationDeadline ?? null)), [data]);

  async function save(deadline: string | null) {
    await apiAuthed.put(`/admin/events/${eventId}/deadline`, { accreditationDeadline: deadline });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    reload();
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Clôture des inscriptions</h3>
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
        Au-delà de cette date, le formulaire public refuse les nouvelles accréditations.
      </p>
      {saved && <div className="banner banner-success">Enregistré.</div>}
      <div className="inline-actions" style={{ alignItems: 'center' }}>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => save(value ? new Date(value).toISOString() : null)}
          disabled={!value}
        >
          Définir la clôture
        </button>
        {data?.accreditationDeadline && (
          <button className="btn btn-ghost btn-sm" onClick={() => save(null)}>
            Retirer (aucune limite)
          </button>
        )}
      </div>
    </div>
  );
}

// ── Récapitulatif périodique ────────────────────────────────────────
export function RecapCard({
  eventId,
  initial,
  onSaved,
}: {
  eventId: string;
  initial: EventRecap;
  onSaved: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [frequency, setFrequency] = useState<RecapFrequency>(initial.frequency);
  const [recipients, setRecipients] = useState<string[]>(initial.recipients);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addEmail() {
    const e = email.trim();
    if (!e || recipients.includes(e)) return;
    setRecipients((r) => [...r, e]);
    setEmail('');
  }

  async function save() {
    setError(null);
    try {
      await apiAuthed.put(`/admin/events/${eventId}/recap`, { frequency, recipients });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function sendNow() {
    setSendResult(null);
    const res = await apiAuthed.post<{ newRegistrations: number; recipients: number }>(
      `/admin/events/${eventId}/recap/test`,
    );
    setSendResult(`Récap envoyé : ${res.newRegistrations} inscription(s) à ${res.recipients} destinataire(s).`);
    onSaved();
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
        Récapitulatif des inscriptions
      </h3>
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
        Envoyez à l'équipe presse un résumé des nouvelles inscriptions. Ajoutez l'email de chaque attaché concerné.
      </p>
      {saved && <div className="banner banner-success">Enregistré.</div>}
      {sendResult && <div className="banner banner-success">{sendResult}</div>}
      {error && <div className="banner banner-error">{error}</div>}

      <div className="field">
        <label>Fréquence</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecapFrequency)}>
          <option value="none">Aucun</option>
          <option value="daily">Quotidien (08:00)</option>
          <option value="weekly">Hebdomadaire (lundi 08:00)</option>
        </select>
      </div>

      <div className="field">
        <label>Destinataires</label>
        <div className="inline-actions">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
            placeholder="attache@presse.fr"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={addEmail}>
            Ajouter
          </button>
        </div>
        {recipients.length > 0 && (
          <div className="inline-actions" style={{ marginTop: 'var(--space-2)' }}>
            {recipients.map((r) => (
              <span key={r} className="chip" aria-pressed={false} style={{ cursor: 'default' }}>
                {r}
                <button
                  type="button"
                  onClick={() => setRecipients((cur) => cur.filter((x) => x !== r))}
                  style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'inherit' }}
                  aria-label={`Retirer ${r}`}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="inline-actions">
        <button className="btn btn-primary" onClick={save}>
          Enregistrer
        </button>
        <button className="btn btn-ghost" onClick={sendNow} disabled={recipients.length === 0}>
          Envoyer maintenant
        </button>
      </div>
    </div>
  );
}

export function ConfigForm({ eventId, config }: { eventId: string; config: EventConfig }) {
  const apiAuthed = useAuthedApi();
  const [c, setC] = useState<EventConfig>(config);
  const [saved, setSaved] = useState(false);
  const num = (k: keyof EventConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setC((p) => ({ ...p, [k]: Number(e.target.value) }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await apiAuthed.put(`/admin/events/${eventId}/config`, c);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <form className="card" onSubmit={save}>
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Configuration
        <InfoBubble title="À quoi servent ces réglages ?">{SCORE_HELP}</InfoBubble>
      </h3>
      {saved && <div className="banner banner-success">Enregistré.</div>}
      <div className="grid-2">
        <Num
          label="Durée interview (min)"
          value={c.itwDurationMin}
          onChange={num('itwDurationMin')}
          help="Durée d'un créneau d'interview. Sert à découper automatiquement les plages de disponibilité des artistes."
        />
        <Num
          label="Battement entre interviews (min)"
          value={c.itwBufferMin}
          onChange={num('itwBufferMin')}
          help="Temps de pause entre deux interviews qui se suivent (transition, respiration de l'artiste). Ex : 5 min."
        />
        <Num
          label="Quota interviews / artiste (défaut)"
          value={c.defaultItwQuota}
          onChange={num('defaultItwQuota')}
          help="Nombre maximum d'interviews accordées par artiste, quand l'artiste n'a pas de quota propre. Au-delà, les demandes passent en liste d'attente."
        />
        <Num
          label="Bonus d'ancienneté / heure"
          value={c.ageBonusPerHour}
          onChange={num('ageBonusPerHour')}
          step="0.1"
          help="Points ajoutés au score pour chaque heure d'attente d'une demande. Évite qu'une demande ancienne soit oubliée. Laissez 0 si vous ne savez pas."
        />
        <Num
          label="Plafond du bonus d'ancienneté"
          value={c.ageBonusCap}
          onChange={num('ageBonusCap')}
          help="Limite maximale du bonus d'ancienneté : une vieille demande remonte, mais sans jamais doubler indéfiniment les autres."
        />
      </div>
      <button className="btn btn-primary" type="submit" style={{ marginTop: 'var(--space-3)' }}>
        Enregistrer la configuration
      </button>
    </form>
  );
}

const PHOTO_RULE_PRESETS = [
  'Concert entier',
  '3 premiers titres',
  '3 premiers titres, sans flash, depuis la fosse',
  '3 derniers titres',
  'Aucune photo en backstage',
];

/** Règles de prise de vue + contrat sur place + autorisation d'utilisation des photos. */
export function PhotoRulesCard({ eventId, config }: { eventId: string; config: EventConfig }) {
  const apiAuthed = useAuthedApi();
  const [rule, setRule] = useState(config.photoRule ?? '');
  const [contract, setContract] = useState(config.onsiteContract);
  const [terms, setTerms] = useState(config.photoTerms ?? '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiAuthed.put(`/admin/events/${eventId}/photo-rules`, {
        photoRule: rule.trim() || null,
        onsiteContract: contract,
        photoTerms: terms.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Règles photo & autorisations
        <InfoBubble title="À quoi ça sert ?">
          La <strong>règle de prise de vue</strong> et l'<strong>autorisation d'utilisation</strong> sont
          jointes automatiquement à l'email d'acceptation de chaque <strong>reportage photo/vidéo</strong>,
          et affichées dans l'espace du journaliste. Cochez « contrat à signer sur place » si la production
          l'exige.
        </InfoBubble>
      </h3>
      {saved && <div className="banner banner-success">Enregistré.</div>}

      <div className="field">
        <label>Règle de prise de vue</label>
        <input
          list="photo-rule-presets"
          value={rule}
          onChange={(e) => setRule(e.target.value)}
          placeholder="Ex. 3 premiers titres, sans flash, depuis la fosse"
        />
        <datalist id="photo-rule-presets">
          {PHOTO_RULE_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 'var(--space-2) 0' }}>
        <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} />
        Contrat à signer sur place (indiqué à l'acceptation des reportages)
      </label>

      <div className="field">
        <label>Autorisation d'utilisation des photos/vidéos (envoyée à chaque acceptation de reportage)</label>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Enregistrement…' : 'Enregistrer les règles photo'}
      </button>
    </form>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
  help,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  help?: ReactNode;
}) {
  return (
    <div className="field">
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
        {help && <InfoBubble>{help}</InfoBubble>}
      </label>
      <input type="number" min={0} step={step ?? '1'} value={value} onChange={onChange} />
    </div>
  );
}

export function TypeWeights({
  eventId,
  weights,
  onSaved,
}: {
  eventId: string;
  weights: EventSettings['typeWeights'];
  onSaved: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [draft, setDraft] = useState(() => Object.fromEntries(weights.map((w) => [w.type, w.multiplier])));
  useEffect(() => setDraft(Object.fromEntries(weights.map((w) => [w.type, w.multiplier]))), [weights]);

  async function save(type: string, multiplier: number) {
    await apiAuthed.put(`/admin/events/${eventId}/type-weights`, { type, multiplier });
    onSaved();
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Multiplicateurs par type de demande
        <InfoBubble title="Multiplicateur par type">
          Importance relative de chaque type de demande dans le score&nbsp;: <strong>1 = normal</strong>,{' '}
          <strong>2 = priorité doublée</strong>. Ex : mettre les interviews à 1.5 les fait remonter
          devant les reportages à 1.
        </InfoBubble>
      </h3>
      <div className="grid-2">
        {weights.map((w) => (
          <div key={w.type} className="inline-actions" style={{ alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{TYPE_LABEL[w.type]}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              style={{ width: 90 }}
              value={draft[w.type] ?? w.multiplier}
              onChange={(e) => setDraft((d) => ({ ...d, [w.type]: Number(e.target.value) }))}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => save(w.type, draft[w.type] ?? w.multiplier)}>
              Enregistrer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaTypes({
  eventId,
  mediaTypes,
  onSaved,
}: {
  eventId: string;
  mediaTypes: EventSettings['mediaTypes'];
  onSaved: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const [label, setLabel] = useState('');
  const [weight, setWeight] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label) return;
    await apiAuthed.post(`/admin/events/${eventId}/media-types`, { label, weight: Number(weight || 0) });
    setLabel('');
    setWeight('');
    onSaved();
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Poids par type de média
        <InfoBubble title="Poids du média">
          Importance de chaque média dans le score (ex : blog = 1, presse nationale = 2, TV nationale = 3).
          Une demande venant d'un média à poids élevé est traitée en priorité.
        </InfoBubble>
      </h3>
      <table className="table" style={{ marginBottom: 'var(--space-3)' }}>
        <thead>
          <tr>
            <th>Type de média</th>
            <th>Poids</th>
          </tr>
        </thead>
        <tbody>
          {mediaTypes.map((m) => (
            <tr key={m.id}>
              <td>{m.label}</td>
              <td>{m.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-actions" onSubmit={add}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouveau type" style={{ flex: 1 }} />
        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Poids" style={{ width: 100 }} />
        <button className="btn btn-primary btn-sm" type="submit">
          Ajouter
        </button>
      </form>
    </div>
  );
}

export function Templates({
  eventId,
  templates,
  onSaved,
}: {
  eventId: string;
  templates: EmailTemplate[];
  onSaved: () => void;
}) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Templates d'emails</h3>
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        Variables disponibles : {'{{firstName}}'}, {'{{event}}'}, {'{{link}}'}, {'{{artist}}'}, {'{{slot}}'}.
        <InfoBubble title="Que devient chaque variable ?">
          Ces étiquettes sont remplacées automatiquement à l'envoi&nbsp;:
          <ul>
            <li><code>{'{{firstName}}'}</code> : prénom du journaliste</li>
            <li><code>{'{{event}}'}</code> : nom de l'événement</li>
            <li><code>{'{{artist}}'}</code> : nom de l'artiste concerné</li>
            <li><code>{'{{slot}}'}</code> : jour + heure du créneau (ex : ven. 10 juil. · 14:00)</li>
            <li><code>{'{{link}}'}</code> : lien personnel d'accès du journaliste</li>
          </ul>
        </InfoBubble>
      </p>
      <div className="stack">
        {templates.map((t) => (
          <TemplateEditor key={t.id} eventId={eventId} template={t} onSaved={onSaved} />
        ))}
      </div>
    </div>
  );
}

function TemplateEditor({ eventId, template, onSaved }: { eventId: string; template: EmailTemplate; onSaved: () => void }) {
  const apiAuthed = useAuthedApi();
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body);
  const [saved, setSaved] = useState(false);

  async function save() {
    await apiAuthed.put(`/admin/events/${eventId}/templates`, {
      lang: template.lang,
      triggerKey: template.triggerKey,
      channel: template.channel,
      subject,
      body,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <details style={{ border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
        {TRIGGER_LABEL[template.triggerKey] ?? template.triggerKey} · {template.lang.toUpperCase()}{' '}
        {saved && <Icon name="check" />}
      </summary>
      <div className="field" style={{ marginTop: 'var(--space-2)' }}>
        <label>Sujet</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label>Corps</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </div>
      <button className="btn btn-ghost btn-sm" onClick={save}>
        Enregistrer
      </button>
    </details>
  );
}
