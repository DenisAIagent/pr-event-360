import { useEffect, useState } from 'react';
import {
  Sparkles,
  BadgeCheck,
  Mic,
  Newspaper,
  Users2,
  ArrowRight,
  ArrowLeft,
  X,
  type LucideIcon,
} from 'lucide-react';

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

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const step = STEPS[i]!;
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <div
      className="tour-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Présentation de l’application"
    >
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <button className="tour-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        <span className="icon-tile tour-icon">
          <Icon size={26} strokeWidth={1.7} />
        </span>

        <h2>{step.title}</h2>
        <p>{step.body}</p>

        <div className="tour-dots" aria-hidden>
          {STEPS.map((_, n) => (
            <span key={n} className={n === i ? 'on' : ''} />
          ))}
        </div>

        <div className="tour-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Passer
          </button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {i > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>
                <ArrowLeft size={16} /> Précédent
              </button>
            )}
            {last ? (
              <button className="btn btn-primary btn-sm" onClick={onClose}>
                Commencer
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>
                Suivant <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
