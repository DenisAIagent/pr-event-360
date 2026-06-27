import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventConfig, EventSettings, EmailTemplate, EventRecap, RecapFrequency } from '../../lib/types';
import { TRIGGER_LABEL, TYPE_LABEL } from '../../lib/labels';
import { Icon } from '../../../components/Icon';

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
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Configuration</h3>
      {saved && <div className="banner banner-success">Enregistré.</div>}
      <div className="grid-2">
        <Num label="Durée interview (min)" value={c.itwDurationMin} onChange={num('itwDurationMin')} />
        <Num label="Battement entre interviews (min)" value={c.itwBufferMin} onChange={num('itwBufferMin')} />
        <Num label="Quota interviews / artiste (défaut)" value={c.defaultItwQuota} onChange={num('defaultItwQuota')} />
        <Num label="Bonus d'ancienneté / heure" value={c.ageBonusPerHour} onChange={num('ageBonusPerHour')} step="0.1" />
        <Num label="Plafond du bonus d'ancienneté" value={c.ageBonusCap} onChange={num('ageBonusCap')} />
      </div>
      <button className="btn btn-primary" type="submit" style={{ marginTop: 'var(--space-3)' }}>
        Enregistrer la configuration
      </button>
    </form>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
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
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Multiplicateurs par type de demande</h3>
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
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Poids par type de média</h3>
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
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
        Variables disponibles : {'{{firstName}}'}, {'{{event}}'}, {'{{link}}'}, {'{{artist}}'}, {'{{slot}}'}.
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
