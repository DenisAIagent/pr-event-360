import { useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Newspaper, Globe, Tv, Radio, Share2, PlayCircle, Mic, Image as ImageIcon, Video, Link2,
  Layers, UserCheck, Clock, BellRing, Send, X, ExternalLink,
} from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { EmptyState } from '../components/EmptyState';
import { MEDIA_CATEGORIES, type PressCoverageItem } from '../../lib/mediaCategories';

interface CoverageTracking {
  journalistId: string;
  name: string;
  email: string | null;
  media: string | null;
  accreditationType: string | null;
  count: number;
  lastAt: string | null;
}
interface CoverageResponse {
  items: PressCoverageItem[];
  tracking: CoverageTracking[];
}

const TYPE_LABEL: Record<string, string> = { presse: 'Presse', photo: 'Photo', video: 'Vidéo' };

// Icône + couleur d'accent par catégorie de média.
const FALLBACK_META = { icon: Link2, color: '#64748b' };
const CAT_META: Record<string, { icon: LucideIcon; color: string }> = {
  presse_ecrite: { icon: Newspaper, color: '#6366f1' },
  web: { icon: Globe, color: '#0ea5e9' },
  tv: { icon: Tv, color: '#ef4444' },
  radio: { icon: Radio, color: '#f59e0b' },
  reseaux_sociaux: { icon: Share2, color: '#ec4899' },
  youtube: { icon: PlayCircle, color: '#dc2626' },
  podcast: { icon: Mic, color: '#8b5cf6' },
  photo: { icon: ImageIcon, color: '#10b981' },
  video: { icon: Video, color: '#14b8a6' },
  autre: FALLBACK_META,
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function RevuePresseTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<CoverageResponse>(
    () => apiAuthed.get<CoverageResponse>(`/admin/events/${eventId}/coverage`),
    [eventId],
  );

  const nameOf = new Map((data?.tracking ?? []).map((t) => [t.journalistId, t.name]));

  async function remind(journalistId?: string) {
    const r = await apiAuthed.post<{ sent: number }>(`/admin/events/${eventId}/coverage/remind`, {
      journalistId: journalistId ?? null,
    });
    toast.success(r.sent > 0 ? `Relance envoyée à ${r.sent} journaliste(s).` : 'Personne à relancer.');
  }

  async function removeItem(id: string) {
    if (!(await confirm({ message: 'Retirer cette retombée de la revue de presse ?', confirmLabel: 'Retirer', danger: true }))) return;
    await apiAuthed.delete(`/admin/events/${eventId}/coverage/${id}`);
    toast.success('Retombée retirée.');
    reload();
  }

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return null;

  const contributors = data.tracking.filter((t) => t.count > 0).length;
  const pending = data.tracking.filter((t) => t.count === 0);
  const categoriesUsed = new Set(data.items.map((i) => i.mediaCategory)).size;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Revue de presse</h2>
        <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
          Les retombées déposées par vos journalistes, classées par média. Chacun reçoit
          automatiquement une invitation à les partager selon le délai qu'il a indiqué à l'inscription.
        </p>
      </div>

      {/* Résumé */}
      <div className="kpis">
        <Kpi num={data.items.length} label="Retombées" icon={Newspaper} variant="k-navy" />
        <Kpi num={categoriesUsed} label="Catégories couvertes" icon={Layers} variant="k-blue" />
        <Kpi num={contributors} label="Ont contribué" icon={UserCheck} variant="k-green" />
        <Kpi num={pending.length} label="En attente" icon={Clock} variant="k-amber" />
      </div>

      {/* Revue par catégorie */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Pas encore de retombées"
          hint="Vos journalistes reçoivent automatiquement un email pour déposer leurs publications et photos, à l'échéance qu'ils ont choisie. Vous pouvez aussi les relancer ci-dessous."
        />
      ) : (
        <div className="stack" style={{ gap: 'var(--space-4)' }}>
          {MEDIA_CATEGORIES.map((cat) => {
            const items = data.items.filter((i) => i.mediaCategory === cat.value);
            if (items.length === 0) return null;
            const meta = CAT_META[cat.value] ?? FALLBACK_META;
            const CatIcon = meta.icon;
            return (
              <section key={cat.value} className="card stack" style={{ gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: `${meta.color}1a`, color: meta.color }}>
                    <CatIcon size={18} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)' }}>{cat.label}</h3>
                  <span className="badge" style={{ background: `${meta.color}1a`, color: meta.color, border: 'none' }}>{items.length}</span>
                </div>

                <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
                  {items.map((i) => (
                    <article key={i.id} className="coverage-card">
                      {i.isUpload && i.thumbnailUrl ? (
                        <a href={i.url} target="_blank" rel="noreferrer" className="coverage-thumb">
                          <img src={i.thumbnailUrl} alt="" />
                        </a>
                      ) : (
                        <a href={i.url} target="_blank" rel="noreferrer" className="coverage-thumb coverage-thumb--icon" style={{ background: `${meta.color}12`, color: meta.color }}>
                          <CatIcon size={26} />
                          <span className="coverage-domain">{domainOf(i.url)}</span>
                        </a>
                      )}
                      <div className="coverage-body">
                        <a href={i.url} target="_blank" rel="noreferrer" className="coverage-title">
                          {i.title || domainOf(i.url)} <ExternalLink size={12} />
                        </a>
                        <span className="coverage-meta">
                          {nameOf.get(i.journalistId ?? '') ?? 'Journaliste'}
                          {i.isUpload && i.archiveConsent && i.promoConsent && ' · ✓ archivage + promo'}
                        </span>
                      </div>
                      <button className="coverage-remove" onClick={() => removeItem(i.id)} title="Retirer" aria-label="Retirer">
                        <X size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Suivi des envois */}
      <div className="card stack" style={{ gap: 'var(--space-3)' }}>
        <div className="section-head" style={{ margin: 0 }}>
          <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Suivi des envois</h3>
          {pending.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => remind()}>
              <BellRing size={14} /> Relancer les {pending.length} en attente
            </button>
          )}
        </div>

        {data.tracking.length === 0 ? (
          <p className="muted">Aucun journaliste accrédité accepté pour l'instant.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {data.tracking.map((t) => (
              <div key={t.journalistId} className="coverage-track">
                <span className="coverage-avatar">{initials(t.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{t.name}</strong>
                  <span className="muted" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>
                    {[t.media, t.accreditationType ? TYPE_LABEL[t.accreditationType] ?? t.accreditationType : null].filter(Boolean).join(' · ') || t.email}
                  </span>
                </div>
                {t.count > 0 ? (
                  <span className="badge badge-success" style={{ whiteSpace: 'nowrap' }}>
                    ✓ {t.count} retombée{t.count > 1 ? 's' : ''}{t.lastAt && ` · ${new Date(t.lastAt).toLocaleDateString('fr-FR')}`}
                  </span>
                ) : (
                  <span className="badge badge-warn" style={{ whiteSpace: 'nowrap' }}>En attente</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => remind(t.journalistId)} title="Relancer ce journaliste">
                  <Send size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ num, label, icon: Icon, variant }: { num: number; label: string; icon: LucideIcon; variant: string }) {
  return (
    <div className={`kpi ${variant}`}>
      <div className="top"><div className="ico"><Icon size={16} /></div></div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}
