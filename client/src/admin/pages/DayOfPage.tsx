import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Presentation,
  QrCode,
  Search,
  Undo2,
  Users,
  Mic,
  UserCheck,
} from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { SkeletonRows } from '../components/Skeleton';

interface DayOfSnapshot {
  event: { id: string; name: string; location: string | null; startDate: string | null; endDate: string | null };
  date: string;
  stats: {
    accredited: number;
    checkedIn: number;
    interviewsToday: number;
    conferencesToday: number;
  };
  interviews: Array<{
    id: string;
    journalistName: string;
    media: string | null;
    email: string;
    participant: string | null;
    slotStart: string | null;
    slotEnd: string | null;
    status: string;
    assignedTo: string | null;
  }>;
  conferences: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    venue: string | null;
    status: string;
  }>;
  arrivals: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    media: string | null;
    accreditationType: string | null;
    checkedInAt: string | null;
  }>;
}

interface CheckInResult {
  alreadyCheckedIn: boolean;
  journalist: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    media: string | null;
    accreditationType: string | null;
    checkedInAt: string | null;
  };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(t: string | null): string {
  if (!t) return '—';
  return t.slice(0, 5);
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/**
 * Vue opérationnelle Jour J — optimisée tactile / mobile :
 * check-in QR ou recherche, arrivées, interviews et conférences du jour.
 */
export function DayOfPage() {
  const { eventId = '' } = useParams();
  const api = useAuthedApi();
  const toast = useToast();
  const [date, setDate] = useState(todayIso);
  const [data, setData] = useState<DayOfSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await api.get<DayOfSnapshot>(
        `/admin/events/${eventId}/day-of?date=${encodeURIComponent(date)}`,
      );
      setData(snap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [api, eventId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doCheckIn(payload: { journalistId?: string; code?: string }) {
    setBusyId(payload.journalistId ?? 'code');
    try {
      const res = await api.post<CheckInResult>(`/admin/events/${eventId}/check-in`, payload);
      setLastCheckIn(res);
      toast.success(
        res.alreadyCheckedIn
          ? `${res.journalist.firstName} déjà présent`
          : `${res.journalist.firstName} check-in ✓`,
      );
      setCode('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-in impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function undo(journalistId: string) {
    setBusyId(journalistId);
    try {
      await api.post(`/admin/events/${eventId}/check-in/undo`, { journalistId });
      toast.success('Check-in annulé');
      setLastCheckIn(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Annulation impossible');
    } finally {
      setBusyId(null);
    }
  }

  function stopScan() {
    setScanning(false);
    if (scanTimer.current) {
      window.clearInterval(scanTimer.current);
      scanTimer.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startScan() {
    // BarcodeDetector (Chrome/Android) — pas de dépendance lourde.
    const BD = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    } }).BarcodeDetector;
    if (!BD) {
      toast.error('Scan caméra non supporté sur ce navigateur — collez le code manuellement.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((r) => setTimeout(r, 50));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new BD({ formats: ['qr_code'] });
      scanTimer.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        void detector.detect(video).then((codes) => {
          const value = codes[0]?.rawValue;
          if (value?.startsWith('pr360ci1.')) {
            stopScan();
            void doCheckIn({ code: value });
          }
        });
      }, 400);
    } catch {
      toast.error('Caméra inaccessible. Autorisez l’accès ou saisissez le code.');
      stopScan();
    }
  }

  const filteredArrivals = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.arrivals;
    return data.arrivals.filter((a) => {
      const hay = `${a.firstName} ${a.lastName ?? ''} ${a.email} ${a.media ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [data, q]);

  if (loading && !data) return <SkeletonRows count={6} />;
  if (error && !data) return <div className="banner banner-error">{error}</div>;
  if (!data) return null;

  const s = data.stats;
  const remaining = Math.max(0, s.accredited - s.checkedIn);

  return (
    <div className="stack dayof" style={{ gap: 'var(--space-3)', maxWidth: 720, margin: '0 auto' }}>
      <header className="dayof-header">
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Jour J · terrain
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 'clamp(1.1rem, 4vw, 1.35rem)', lineHeight: 1.25 }}>
            {data.event.name}
          </h2>
          <div className="muted dayof-meta">
            {data.event.location && (
              <span>
                <MapPin size={13} /> {data.event.location}
              </span>
            )}
            <label className="dayof-date">
              <CalendarDays size={13} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} style={{ flex: 'none' }}>
          Actualiser
        </button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
        }}
      >
        <Stat label="Accrédités" value={s.accredited} icon={Users} />
        <Stat label="Présents" value={s.checkedIn} icon={CheckCircle2} accent />
        <Stat label="Restants" value={remaining} icon={Clock} />
        <Stat label="Interviews" value={s.interviewsToday} icon={Mic} />
        <Stat label="Conférences" value={s.conferencesToday} icon={Presentation} />
      </div>

      {lastCheckIn && (
        <div
          className="card"
          style={{
            padding: 16,
            borderLeft: `4px solid ${lastCheckIn.alreadyCheckedIn ? 'var(--color-warn, #f59e0b)' : 'var(--color-success, #16a34a)'}`,
          }}
        >
          <strong>
            {lastCheckIn.journalist.firstName} {lastCheckIn.journalist.lastName ?? ''}
          </strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {lastCheckIn.journalist.media ?? '—'} · {lastCheckIn.journalist.email}
          </div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {lastCheckIn.alreadyCheckedIn ? 'Déjà check-in' : 'Check-in enregistré'}
            {lastCheckIn.journalist.checkedInAt
              ? ` à ${formatWhen(lastCheckIn.journalist.checkedInAt)}`
              : ''}
          </div>
        </div>
      )}

      <section className="card dayof-checkin" style={{ padding: 14 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <QrCode size={18} /> Check-in par QR
        </h3>
        <div className="dayof-checkin-row">
          <input
            type="text"
            placeholder="Coller le code QR…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            inputMode="text"
            enterKeyHint="go"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.trim()) void doCheckIn({ code: code.trim() });
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!code.trim() || busyId === 'code'}
            onClick={() => void doCheckIn({ code: code.trim() })}
          >
            Valider
          </button>
        </div>
        {!scanning ? (
          <button type="button" className="btn btn-ghost dayof-scan-btn" onClick={() => void startScan()}>
            Scanner avec la caméra
          </button>
        ) : (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <video
              ref={videoRef}
              muted
              playsInline
              className="dayof-video"
            />
            <button type="button" className="btn btn-ghost" onClick={stopScan}>
              Arrêter le scan
            </button>
          </div>
        )}
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.4 }}>
          En cas de panne caméra / QR illisible : utilisez la liste ci-dessous et le bouton{' '}
          <strong>Accueil physique OK</strong>.
        </p>
      </section>

      <section className="card dayof-manual" style={{ padding: 14 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={18} /> Accueil physique (secours)
        </h3>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.45 }}>
          Identifiez le journaliste (pièce d’identité / badge / liste) puis validez manuellement —
          même effet qu’un scan QR pour la présence RP et le compteur « Présents ».
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <Search size={16} className="muted" />
          <input
            type="search"
            placeholder="Nom, média ou email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minHeight: 48, fontSize: 16 }}
            autoComplete="off"
          />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {filteredArrivals.map((a) => {
            const name = `${a.firstName} ${a.lastName ?? ''}`.trim();
            const present = !!a.checkedInAt;
            return (
              <div
                key={a.id}
                className={`card dayof-arrival${present ? ' is-present' : ''}`}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {a.media ?? '—'} · {a.accreditationType ?? 'presse'}
                    {present && a.checkedInAt ? ` · ${formatWhen(a.checkedInAt)}` : ''}
                  </div>
                </div>
                {present ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-success" style={{ whiteSpace: 'nowrap' }}>
                      Présent
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ minHeight: 44 }}
                      disabled={busyId === a.id}
                      onClick={() => void undo(a.id)}
                      title="Annuler la présence"
                    >
                      <Undo2 size={16} /> Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary dayof-manual-btn"
                    disabled={busyId === a.id}
                    onClick={() => void doCheckIn({ journalistId: a.id })}
                  >
                    <UserCheck size={16} />
                    Accueil physique OK
                  </button>
                )}
              </div>
            );
          })}
          {filteredArrivals.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 16 }}>
              {q.trim()
                ? 'Aucun accrédité ne correspond à la recherche.'
                : 'Aucun accrédité à afficher.'}
            </p>
          )}
        </div>
      </section>

      {data.interviews.length > 0 && (
        <section className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic size={18} /> Interviews du jour
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.interviews.map((i) => (
              <li key={i.id} style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>
                  {formatTime(i.slotStart)}
                  {i.slotEnd ? `–${formatTime(i.slotEnd)}` : ''} · {i.participant ?? '—'}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {i.journalistName}
                  {i.media ? ` · ${i.media}` : ''}
                  {i.assignedTo ? ` · → ${i.assignedTo}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.conferences.length > 0 && (
        <section className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Presentation size={18} /> Conférences du jour
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.conferences.map((c) => (
              <li key={c.id} style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>{c.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatWhen(c.startsAt)}
                  {c.venue ? ` · ${c.venue}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: '12px 14px',
        borderTop: accent ? '3px solid var(--color-success, #16a34a)' : undefined,
      }}
    >
      <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
