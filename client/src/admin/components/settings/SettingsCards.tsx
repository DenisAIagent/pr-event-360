import { useEffect, useState, type ReactNode } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventConfig, EventSettings, EmailTemplate, EventRecap, RecapFrequency } from '../../lib/types';
import { TRIGGER_LABEL, TYPE_LABEL } from '../../lib/labels';
import { Icon } from '../../../components/Icon';
import { InfoBubble } from '../InfoBubble';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Bandeau de confirmation « Enregistré » réutilisé dans les cartes de réglages. */
function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {children}
    </div>
  );
}

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clôture des inscriptions</CardTitle>
        <CardDescription>
          Au-delà de cette date, le formulaire public refuse les nouvelles accréditations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {saved && <SuccessBanner>Enregistré.</SuccessBanner>}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-auto"
          />
          <Button
            size="sm"
            onClick={() => save(value ? new Date(value).toISOString() : null)}
            disabled={!value}
          >
            Définir la clôture
          </Button>
          {data?.accreditationDeadline && (
            <Button variant="ghost" size="sm" onClick={() => save(null)}>
              Retirer (aucune limite)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Récapitulatif des inscriptions</CardTitle>
        <CardDescription>
          Envoyez à l'équipe presse un résumé des nouvelles inscriptions. Ajoutez l'email de chaque attaché
          concerné.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {saved && <SuccessBanner>Enregistré.</SuccessBanner>}
        {sendResult && <SuccessBanner>{sendResult}</SuccessBanner>}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Label htmlFor="recap-frequency">Fréquence</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as RecapFrequency)}>
            <SelectTrigger id="recap-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              <SelectItem value="daily">Quotidien (08:00)</SelectItem>
              <SelectItem value="weekly">Hebdomadaire (lundi 08:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="recap-email">Destinataires</Label>
          <div className="flex gap-2">
            <Input
              id="recap-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              placeholder="attache@presse.fr"
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addEmail}>
              Ajouter
            </Button>
          </div>
          {recipients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recipients.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button
                    type="button"
                    onClick={() => setRecipients((cur) => cur.filter((x) => x !== r))}
                    className="ml-1 cursor-pointer text-inherit"
                    aria-label={`Retirer ${r}`}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>Enregistrer</Button>
          <Button variant="ghost" onClick={sendNow} disabled={recipients.length === 0}>
            Envoyer maintenant
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          Configuration
          <InfoBubble title="À quoi servent ces réglages ?">{SCORE_HELP}</InfoBubble>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={save}>
          {saved && <SuccessBanner>Enregistré.</SuccessBanner>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div>
            <Button type="submit">Enregistrer la configuration</Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          Règles photo &amp; autorisations
          <InfoBubble title="À quoi ça sert ?">
            La <strong>règle de prise de vue</strong> et l'<strong>autorisation d'utilisation</strong> sont
            jointes automatiquement à l'email d'acceptation de chaque <strong>reportage photo/vidéo</strong>,
            et affichées dans l'espace du journaliste. Cochez « contrat à signer sur place » si la production
            l'exige.
          </InfoBubble>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={save}>
          {saved && <SuccessBanner>Enregistré.</SuccessBanner>}

          <div className="grid gap-2">
            <Label htmlFor="photo-rule">Règle de prise de vue</Label>
            <Input
              id="photo-rule"
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="onsite-contract"
              checked={contract}
              onCheckedChange={(v) => setContract(v === true)}
            />
            <Label htmlFor="onsite-contract" className="font-normal">
              Contrat à signer sur place (indiqué à l'acceptation des reportages)
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo-terms">
              Autorisation d'utilisation des photos/vidéos (envoyée à chaque acceptation de reportage)
            </Label>
            <Textarea id="photo-terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} />
          </div>

          <div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer les règles photo'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
    <div className="grid gap-2">
      <Label className="inline-flex items-center gap-1.5">
        {label}
        {help && <InfoBubble>{help}</InfoBubble>}
      </Label>
      <Input type="number" min={0} step={step ?? '1'} value={value} onChange={onChange} />
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
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          Multiplicateurs par type de demande
          <InfoBubble title="Multiplicateur par type">
            Importance relative de chaque type de demande dans le score&nbsp;: <strong>1 = normal</strong>,{' '}
            <strong>2 = priorité doublée</strong>. Ex : mettre les interviews à 1.5 les fait remonter
            devant les reportages à 1.
          </InfoBubble>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {weights.map((w) => (
            <div key={w.type} className="flex items-center gap-2">
              <span className="flex-1">{TYPE_LABEL[w.type]}</span>
              <Input
                type="number"
                step="0.1"
                min={0}
                className="w-24"
                value={draft[w.type] ?? w.multiplier}
                onChange={(e) => setDraft((d) => ({ ...d, [w.type]: Number(e.target.value) }))}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save(w.type, draft[w.type] ?? w.multiplier)}
              >
                Enregistrer
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          Poids par type de média
          <InfoBubble title="Poids du média">
            Importance de chaque média dans le score (ex : blog = 1, presse nationale = 2, TV nationale = 3).
            Une demande venant d'un média à poids élevé est traitée en priorité.
          </InfoBubble>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type de média</TableHead>
              <TableHead>Poids</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mediaTypes.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.label}</TableCell>
                <TableCell>{m.weight}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <form className="flex gap-2" onSubmit={add}>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nouveau type"
            className="flex-1"
          />
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Poids"
            className="w-24"
          />
          <Button size="sm" type="submit">
            Ajouter
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Templates d'emails</CardTitle>
        <CardDescription className="inline-flex flex-wrap items-center gap-1.5">
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
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {templates.map((t) => (
          <TemplateEditor key={t.id} eventId={eventId} template={t} onSaved={onSaved} />
        ))}
      </CardContent>
    </Card>
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
    <details className="rounded-md border p-2">
      <summary className="cursor-pointer text-sm font-semibold">
        {TRIGGER_LABEL[template.triggerKey] ?? template.triggerKey} · {template.lang.toUpperCase()}{' '}
        {saved && <Icon name="check" />}
      </summary>
      <div className="mt-2 grid gap-2">
        <Label htmlFor={`tpl-subject-${template.id}`}>Sujet</Label>
        <Input
          id={`tpl-subject-${template.id}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="mt-2 grid gap-2">
        <Label htmlFor={`tpl-body-${template.id}`}>Corps</Label>
        <Textarea
          id={`tpl-body-${template.id}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={save} className="mt-3">
        Enregistrer
      </Button>
    </details>
  );
}
