import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Link2,
  Plug,
  RefreshCw,
  Ticket,
  Unplug,
  Wand2,
} from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { PageHero } from '../components/PageHero';
import { useToast } from '../components/Toast';
import { SkeletonRows } from '../components/Skeleton';

interface CredentialField {
  key: string;
  label: string;
  secret?: boolean;
  hint?: string;
  placeholder?: string;
}

interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  docsUrl: string;
  capabilities: {
    listEvents: boolean;
    listTickets: boolean;
    createGuest: boolean;
    readCheckIns: boolean;
    webhooks: boolean;
  };
  credentialFields: CredentialField[];
}

interface TicketingStatus {
  connected: boolean;
  encryptionReady: boolean;
  providers: ProviderInfo[];
  connection?: {
    provider: string;
    mode: 'live' | 'sandbox';
    status: string;
    lastError: string | null;
    lastSyncAt: string | null;
    lastTestAt: string | null;
    externalEventId: string | null;
    externalEventName: string | null;
    externalTicketId: string | null;
    externalTicketName: string | null;
    autoProvision: boolean;
    autoSyncCheckin: boolean;
    hasCredentials: boolean;
  };
  stats: { total: number; scanned: number };
  links: Array<{
    journalistId: string;
    barcode: string | null;
    externalStatus: string | null;
    lastScannedAt: string | null;
    provisionedAt: string;
  }>;
}

interface RemoteEvent {
  id: string;
  name: string;
}
interface RemoteTicket {
  id: string;
  name: string;
  price?: number | null;
  isGuestFriendly?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4;

/**
 * Intégration billetterie par événement — parcours guidé pour connecter
 * Weezevent / Billetweb / Eventbrite / Shotgun et synchroniser les check-ins.
 */
export function TicketingTab() {
  const { eventId = '' } = useParams();
  const api = useAuthedApi();
  const toast = useToast();
  const [status, setStatus] = useState<TicketingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WizardStep>(1);
  const [providerId, setProviderId] = useState('weezevent');
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [remoteEvents, setRemoteEvents] = useState<RemoteEvent[]>([]);
  const [remoteTickets, setRemoteTickets] = useState<RemoteTicket[]>([]);
  const [extEventId, setExtEventId] = useState('');
  const [extTicketId, setExtTicketId] = useState('');
  const [autoProvision, setAutoProvision] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.get<TicketingStatus>(`/admin/events/${eventId}/ticketing`);
      setStatus(s);
      if (s.connection) {
        setProviderId(s.connection.provider);
        setMode(s.connection.mode);
        setExtEventId(s.connection.externalEventId ?? '');
        setExtTicketId(s.connection.externalTicketId ?? '');
        setAutoProvision(s.connection.autoProvision);
        setAutoSync(s.connection.autoSyncCheckin);
        setStep(s.connection.status === 'connected' ? 4 : 2);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [api, eventId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const provider = status?.providers.find((p) => p.id === providerId);

  async function saveConnection(partial?: {
    externalEventId?: string;
    externalEventName?: string;
    externalTicketId?: string;
    externalTicketName?: string;
  }) {
    setBusy(true);
    try {
      const extEv = partial?.externalEventId ?? extEventId;
      const extTk = partial?.externalTicketId ?? extTicketId;
      const s = await api.put<TicketingStatus>(`/admin/events/${eventId}/ticketing`, {
        provider: providerId,
        mode,
        credentials: mode === 'live' ? creds : { sandbox: '1' },
        externalEventId: extEv || null,
        externalEventName:
          partial?.externalEventName ??
          remoteEvents.find((e) => e.id === extEv)?.name ??
          status?.connection?.externalEventName ??
          null,
        externalTicketId: extTk || null,
        externalTicketName:
          partial?.externalTicketName ??
          remoteTickets.find((t) => t.id === extTk)?.name ??
          status?.connection?.externalTicketName ??
          null,
        autoProvision,
        autoSyncCheckin: autoSync,
      });
      setStatus(s);
      toast.success('Configuration enregistrée');
      return s;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function testAndContinue() {
    setBusy(true);
    try {
      const saved = await saveConnection();
      if (!saved) return;
      const r = await api.post<{ ok: boolean; message: string }>(
        `/admin/events/${eventId}/ticketing/test`,
      );
      toast.success(r.message);
      const events = await api.get<RemoteEvent[]>(`/admin/events/${eventId}/ticketing/remote-events`);
      setRemoteEvents(events);
      setStep(3);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Test échoué');
    } finally {
      setBusy(false);
    }
  }

  async function loadTickets(forEventId: string) {
    setBusy(true);
    try {
      const tickets = await api.get<RemoteTicket[]>(
        `/admin/events/${eventId}/ticketing/remote-tickets?externalEventId=${encodeURIComponent(forEventId)}`,
      );
      setRemoteTickets(tickets);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Tarifs introuvables');
    } finally {
      setBusy(false);
    }
  }

  async function finalizeMapping() {
    const ev = remoteEvents.find((e) => e.id === extEventId);
    const tk = remoteTickets.find((t) => t.id === extTicketId);
    if (!extEventId || !extTicketId) {
      toast.error('Choisissez un événement et un tarif « Presse ».');
      return;
    }
    setBusy(true);
    try {
      await saveConnection({
        externalEventId: extEventId,
        externalEventName: ev?.name,
        externalTicketId: extTicketId,
        externalTicketName: tk?.name,
      });
      await api.post(`/admin/events/${eventId}/ticketing/test`);
      const prov = await api.post<{ provisioned: number; failed: number }>(
        `/admin/events/${eventId}/ticketing/provision-missing`,
      );
      toast.success(
        `Billetterie active — ${prov.provisioned} invité(s) provisionné(s)${prov.failed ? `, ${prov.failed} échec(s)` : ''}.`,
      );
      setStep(4);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Activation impossible');
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      const r = await api.post<{ scanned: number; updated: number }>(
        `/admin/events/${eventId}/ticketing/sync`,
      );
      toast.success(`Sync : ${r.scanned} scan(s) vus, ${r.updated} arrivée(s) RP mises à jour.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync impossible');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.delete(`/admin/events/${eventId}/ticketing`);
      toast.success('Billetterie déconnectée');
      setStep(1);
      setCreds({});
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Déconnexion impossible');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <SkeletonRows count={4} />;

  return (
    <div className="stack">
      <PageHero
        eyebrow="Intégration"
        title="Billetterie"
        subtitle="Un scan d’entrée pour la prod (jauge) et le RP (journalistes arrivés). Connectez Weezevent, Billetweb, Eventbrite ou Shotgun en quelques clics."
      />

      {!status?.encryptionReady && (
        <div className="banner banner-warn">
          Le chiffrement des clés API n’est pas configuré sur le serveur (
          <code>APP_ENCRYPTION_KEY</code>). Le mode <strong>bac à sable</strong> fonctionne sans clé ;
          le mode live nécessite cette variable.
        </div>
      )}

      <div className="ticketing-steps" aria-label="Étapes de configuration">
        {[
          { n: 1 as const, label: 'Fournisseur' },
          { n: 2 as const, label: 'Connexion' },
          { n: 3 as const, label: 'Événement & tarif' },
          { n: 4 as const, label: 'Pilotif' },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            className={`ticketing-step${step === s.n ? ' on' : ''}${step > s.n ? ' done' : ''}`}
            onClick={() => setStep(s.n)}
          >
            <span className="n">{s.n}</span>
            {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Choisissez votre billetterie</h2>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Commencez en <strong>bac à sable</strong> pour valider le parcours sans compte API, puis
            basculez en live avec vos clés.
          </p>
          <div className="ticketing-providers">
            {status?.providers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ticketing-provider${providerId === p.id ? ' on' : ''}`}
                onClick={() => setProviderId(p.id)}
              >
                <strong>{p.label}</strong>
                <span className="muted">{p.description}</span>
                <span className="ticketing-caps">
                  {p.capabilities.readCheckIns ? 'Scans' : '—'} ·{' '}
                  {p.capabilities.createGuest ? 'Invités auto' : 'Invités manuels'} ·{' '}
                  {p.capabilities.webhooks ? 'Webhooks' : 'Sync auto'}
                </span>
              </button>
            ))}
          </div>
          <div className="row-between">
            <a
              href={provider?.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <ExternalLink size={14} /> Documentation {provider?.label}
            </a>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              Continuer →
            </button>
          </div>
        </section>
      )}

      {step === 2 && provider && (
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
            Connexion {provider.label}
          </h2>
          <div className="segmented" role="group" aria-label="Mode">
            <button type="button" className={mode === 'sandbox' ? 'on' : ''} onClick={() => setMode('sandbox')}>
              <Wand2 size={14} /> Bac à sable (recommandé pour démarrer)
            </button>
            <button type="button" className={mode === 'live' ? 'on' : ''} onClick={() => setMode('live')}>
              <Plug size={14} /> Live (API réelle)
            </button>
          </div>
          {mode === 'sandbox' ? (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Aucune clé requise. Les invités et scans sont simulés dans PR Event 360 — parfait pour
              former l’équipe et valider le double usage prod + RP.
            </p>
          ) : (
            <div className="stack">
              {provider.credentialFields.map((f) => (
                <div key={f.key} className="field">
                  <label htmlFor={`tk-${f.key}`}>{f.label}</label>
                  <input
                    id={`tk-${f.key}`}
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={f.placeholder ?? (f.secret ? '••••••••' : '')}
                    value={creds[f.key] ?? ''}
                    onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                  />
                  {f.hint && <span className="field-hint">{f.hint}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="row-between">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
              ← Retour
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void testAndContinue()}>
              {busy ? 'Test…' : 'Tester et continuer →'}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Événement & tarif Presse</h2>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
            Mappez cet événement PR360 vers l’événement billetterie et un tarif gratuit / invitation
            presse. À chaque accréditation acceptée, un invité sera provisionné sur ce tarif.
          </p>
          <div className="field">
            <label htmlFor="tk-ev">Événement billetterie</label>
            <select
              id="tk-ev"
              value={extEventId}
              onChange={(e) => {
                setExtEventId(e.target.value);
                setExtTicketId('');
                if (e.target.value) void loadTickets(e.target.value);
              }}
            >
              <option value="">— Choisir —</option>
              {remoteEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tk-tic">Tarif / ticket Presse</label>
            <select
              id="tk-tic"
              value={extTicketId}
              onChange={(e) => setExtTicketId(e.target.value)}
              disabled={!extEventId}
            >
              <option value="">— Choisir —</option>
              {remoteTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isGuestFriendly ? ' · invité' : ''}
                  {t.price != null ? ` · ${t.price}€` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="ticketing-check">
            <input
              type="checkbox"
              checked={autoProvision}
              onChange={(e) => setAutoProvision(e.target.checked)}
            />
            Créer automatiquement un invité billetterie à l’acceptation d’accréditation
          </label>
          <label className="ticketing-check">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            Synchroniser les scans billetterie vers les arrivées RP (Jour J)
          </label>
          <div className="row-between">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
              ← Retour
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void finalizeMapping()}>
              {busy ? 'Activation…' : 'Activer la billetterie →'}
            </button>
          </div>
        </section>
      )}

      {step === 4 && status && (
        <>
          <section className="card stack">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                  {status.connection?.status === 'connected' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={22} color="var(--color-success)" /> Billetterie active
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CircleDashed size={22} /> Configuration enregistrée
                    </span>
                  )}
                </h2>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                  {status.connection?.provider} · mode {status.connection?.mode}
                  {status.connection?.externalEventName
                    ? ` · ${status.connection.externalEventName}`
                    : ''}
                  {status.connection?.externalTicketName
                    ? ` · ${status.connection.externalTicketName}`
                    : ''}
                </p>
                {status.connection?.lastError && (
                  <p className="banner banner-error" style={{ marginTop: 12 }}>
                    {status.connection.lastError}
                  </p>
                )}
              </div>
              <div className="inline-actions">
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void syncNow()}>
                  <RefreshCw size={14} /> Sync scans
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void disconnect()}>
                  <Unplug size={14} /> Déconnecter
                </button>
              </div>
            </div>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <div className="kpi k-navy">
                <div className="num">{status.stats.total}</div>
                <div className="lbl">Invités liés</div>
              </div>
              <div className="kpi k-green">
                <div className="num">{status.stats.scanned}</div>
                <div className="lbl">Scannés billetterie</div>
              </div>
              <div className="kpi k-blue">
                <div className="num">
                  {status.connection?.lastSyncAt
                    ? new Date(status.connection.lastSyncAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </div>
                <div className="lbl">Dernière sync</div>
              </div>
            </div>
            <div className="share-card" style={{ margin: 0 }}>
              <div className="share-head">
                <strong>
                  <Ticket size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Comment ça marche le jour J
                </strong>
              </div>
              <ol className="share-steps">
                <li>
                  La <strong>prod</strong> scanne avec l’app billetterie (WeezAccess, etc.) — jauge légale
                  à jour.
                </li>
                <li>
                  PR360 synchronise les scans (toutes les 2 min ou bouton Sync) → le <strong>RP</strong>{' '}
                  voit les journalistes arrivés dans Jour J.
                </li>
                <li>
                  Mode bac à sable : utilisez « Simuler un scan » sur un accrédité pour tester sans
                  terminal.
                </li>
              </ol>
            </div>
            {status.connection?.mode === 'sandbox' && status.links[0] && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void (async () => {
                    setBusy(true);
                    try {
                      await api.post(`/admin/events/${eventId}/ticketing/simulate-scan`, {
                        journalistId: status.links[0]!.journalistId,
                      });
                      toast.success('Scan simulé — vérifiez Jour J');
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Échec');
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
              >
                <Link2 size={16} /> Simuler un scan (1er invité lié)
              </button>
            )}
          </section>

          {status.links.length > 0 && (
            <section className="card" style={{ padding: 'var(--space-3)', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Journalistes liés à la billetterie</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Barcode / invité</th>
                    <th>Statut</th>
                    <th>Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {status.links.map((l) => (
                    <tr key={l.journalistId}>
                      <td>
                        <code style={{ fontSize: 12 }}>{l.barcode ?? '—'}</code>
                      </td>
                      <td>{l.externalStatus ?? '—'}</td>
                      <td>
                        {l.lastScannedAt
                          ? new Date(l.lastScannedAt).toLocaleString('fr-FR')
                          : 'Non scanné'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
