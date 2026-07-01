import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BadgeCheck,
  Mic,
  Newspaper,
  Users2,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue dans PR Event 360',
    body: "Votre plateforme pour piloter les relations presse de vos événements — accréditations, demandes, communications et médias, au même endroit.",
  },
  {
    icon: BadgeCheck,
    title: 'Événements & accréditations',
    body: "Créez un événement, partagez le lien d'inscription, et validez les demandes d'accréditation des journalistes en un clic.",
  },
  {
    icon: Mic,
    title: 'Demandes d’interviews & reportages',
    body: 'Gérez les demandes par artiste ou par scène, appliquez vos quotas, et exportez des PDF prêts à remettre aux régisseurs.',
  },
  {
    icon: Newspaper,
    title: 'Communications & newsroom',
    body: 'Envoyez des newsletters, publiez vos communiqués et dossiers de presse, et partagez photos, vidéos et logos téléchargeables.',
  },
  {
    icon: Users2,
    title: 'Équipe & intégrations',
    body: 'Invitez des collaborateurs avec différents niveaux d’accès et connectez vos outils (Brevo, Cloudinary) en toute sécurité.',
  },
];

/** Visite guidée d'accueil : présente brièvement l'app en quelques étapes. */
export function IntroTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const step = STEPS[i]!;
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md" aria-label="Présentation de l’application">
        <DialogHeader>
          <span className="grid size-14 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon size={26} strokeWidth={1.7} />
          </span>
          <DialogTitle className="mt-3 text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base">{step.body}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2" aria-hidden>
          {STEPS.map((_, n) => (
            <span
              key={n}
              className={cn('size-1.5 rounded-full transition-colors', n === i ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Passer
          </Button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>
                <ArrowLeft size={16} /> Précédent
              </Button>
            )}
            {last ? (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  navigate('/admin/events/new');
                }}
              >
                Créer un événement <ArrowRight size={16} />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setI(i + 1)}>
                Suivant <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
