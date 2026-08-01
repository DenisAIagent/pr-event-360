import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CalendarPlus,
  BadgeCheck,
  Mic2,
  Clapperboard,
  CalendarCheck,
  Megaphone,
  ArrowRight,
  ArrowLeft,
  X,
  type LucideIcon,
} from 'lucide-react';

export const INTRO_SEEN_KEY = 'pr360.introSeen.v2';

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Conseils concrets affichés sous le texte. */
  tips?: string[];
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue dans PR Event 360',
    body: 'Pilotez les relations presse de bout en bout : accréditations, demandes, production, jour J et bilans — au même endroit.',
    tips: [
      'Un événement = un espace de travail dédié',
      'Vous pourrez tout ajuster après la création',
    ],
  },
  {
    icon: CalendarPlus,
    title: '1. Créez votre événement',
    body: 'Le wizard vous guide : infos, apparence, participants, règles et date de clôture des accréditations.',
    tips: [
      'Choisissez le bon type (festival, salon, conférence…)',
      'Les langues activées s’affichent aux journalistes',
    ],
  },
  {
    icon: BadgeCheck,
    title: '2. Accueillez les journalistes',
    body: 'Partagez le lien d’inscription, validez les accréditations, puis renvoyez un lien d’accès personnel si besoin.',
    tips: [
      'Copiez le lien depuis le bandeau de l’événement',
      'Export CSV / PDF pour les listes terrain',
    ],
  },
  {
    icon: Clapperboard,
    title: '3. Configuration & production',
    body: 'Ajoutez scènes et participants, puis déclarez des contacts production. Ils reçoivent un lien pour donner un avis sur les interviews — sans modifier vos quotas.',
    tips: [
      'Menu « Contacts prod » à côté de Configuration',
      'L’avis est consultatif : vous restez décisionnaire',
    ],
  },
  {
    icon: Mic2,
    title: '4. Traitez les demandes',
    body: 'File globale, vues par participant ou planning : priorisez, assignez, notez, et suivez les avis production (badge sur Demandes).',
    tips: [
      'Raccourcis clavier A / R pour accepter ou refuser',
      'PDF brandés pour envoyer un lot à la prod',
    ],
  },
  {
    icon: CalendarCheck,
    title: '5. Jour J',
    body: 'Scannez les QR des badges à l’entrée presse, suivez les arrivées en temps réel depuis la vue terrain mobile.',
    tips: [
      'Badge QR dans l’espace journaliste',
      'Idéal sur téléphone ou tablette à l’accueil',
    ],
  },
  {
    icon: Megaphone,
    title: '6. Communiquez & clôturez',
    body: 'Newsroom, communiqués, newsletters, médiathèque, revue de presse et bilan PDF aux couleurs de l’événement.',
    tips: [
      'Invitez l’équipe (admin / attaché / assistant)',
      'Rouvrez cette visite via la boussole en bas du menu',
    ],
  },
];

/** Visite guidée d'accueil : parcours produit en étapes actionnables. */
export function IntroTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const navigate = useNavigate();

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
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
    >
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tour-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        <div className="tour-progress" aria-hidden>
          Étape {i + 1} / {STEPS.length}
        </div>

        <span className="icon-tile tour-icon">
          <Icon size={26} strokeWidth={1.7} />
        </span>

        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>

        {step.tips && step.tips.length > 0 && (
          <ul className="tour-tips">
            {step.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}

        <div className="tour-dots" role="tablist" aria-label="Étapes de la visite">
          {STEPS.map((s, n) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Étape ${n + 1} : ${s.title}`}
              className={n === i ? 'on' : n < i ? 'done' : ''}
              onClick={() => setI(n)}
            />
          ))}
        </div>

        <div className="tour-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Passer
          </button>
          <div className="tour-foot-nav">
            {i > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>
                <ArrowLeft size={16} /> Précédent
              </button>
            )}
            {last ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  navigate('/admin/events/new');
                }}
              >
                Créer un événement <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>
                Suivant <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
