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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!data) return null;

  const contributors = data.tracking.filter((t) => t.count > 0).length;
  const pending = data.tracking.filter((t) => t.count === 0);
  const categoriesUsed = new Set(data.items.map((i) => i.mediaCategory)).size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Revue de presse</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Les retombées déposées par vos journalistes, classées par média. Chacun reçoit
          automatiquement une invitation à les partager selon le délai qu'il a indiqué à l'inscription.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi num={data.items.length} label="Retombées" icon={Newspaper} color="#6366f1" />
        <Kpi num={categoriesUsed} label="Catégories couvertes" icon={Layers} color="#0ea5e9" />
        <Kpi num={contributors} label="Ont contribué" icon={UserCheck} color="#10b981" />
        <Kpi num={pending.length} label="En attente" icon={Clock} color="#f59e0b" />
      </div>

      {/* Revue par catégorie */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Pas encore de retombées"
          hint="Vos journalistes reçoivent automatiquement un email pour déposer leurs publications et photos, à l'échéance qu'ils ont choisie. Vous pouvez aussi les relancer ci-dessous."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {MEDIA_CATEGORIES.map((cat) => {
            const items = data.items.filter((i) => i.mediaCategory === cat.value);
            if (items.length === 0) return null;
            const meta = CAT_META[cat.value] ?? FALLBACK_META;
            const CatIcon = meta.icon;
            return (
              <Card key={cat.value}>
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-9 place-items-center rounded-lg"
                      style={{ background: `${meta.color}1a`, color: meta.color }}
                    >
                      <CatIcon size={18} />
                    </span>
                    <h3 className="text-base font-semibold">{cat.label}</h3>
                    <Badge className="border-transparent" style={{ background: `${meta.color}1a`, color: meta.color }}>
                      {items.length}
                    </Badge>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Suivi des envois */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Suivi des envois</h3>
            {pending.length > 0 && (
              <Button size="sm" onClick={() => remind()}>
                <BellRing size={14} /> Relancer les {pending.length} en attente
              </Button>
            )}
          </div>

          {data.tracking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun journaliste accrédité accepté pour l'instant.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.tracking.map((t) => (
                <div key={t.journalistId} className="flex items-center gap-3 rounded-lg border p-2">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <strong>{t.name}</strong>
                    <span className="block text-xs text-muted-foreground">
                      {[t.media, t.accreditationType ? TYPE_LABEL[t.accreditationType] ?? t.accreditationType : null].filter(Boolean).join(' · ') || t.email}
                    </span>
                  </div>
                  {t.count > 0 ? (
                    <Badge className="whitespace-nowrap border-transparent bg-emerald-100 text-emerald-800">
                      ✓ {t.count} retombée{t.count > 1 ? 's' : ''}{t.lastAt && ` · ${new Date(t.lastAt).toLocaleDateString('fr-FR')}`}
                    </Badge>
                  ) : (
                    <Badge className="whitespace-nowrap border-transparent bg-amber-100 text-amber-800">En attente</Badge>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => remind(t.journalistId)} title="Relancer ce journaliste">
                    <Send size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ num, label, icon: Icon, color }: { num: number; label: string; icon: LucideIcon; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
          <Icon size={16} />
        </span>
        <div>
          <div className="text-2xl font-semibold leading-none">{num}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
