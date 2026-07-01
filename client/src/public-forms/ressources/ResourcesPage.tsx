import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Mic,
  CalendarRange,
  Newspaper,
  Users2,
  SlidersHorizontal,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface Guide {
  icon: LucideIcon;
  title: string;
  points: string[];
}

const GUIDES: Guide[] = [
  {
    icon: BadgeCheck,
    title: 'Accréditations',
    points: [
      'Partagez le lien d’inscription public (multilingue, à vos couleurs).',
      'Acceptez ou refusez chaque demande : à l’acceptation, le journaliste reçoit automatiquement un email avec son lien personnel.',
      'Fixez une date de clôture : un compte à rebours s’affiche, puis le formulaire se ferme.',
    ],
  },
  {
    icon: Mic,
    title: 'Demandes d’interview & reportage',
    points: [
      '4 vues : file globale, par artiste, par scène, et planning par créneau.',
      'Un score de priorité classe les demandes ; appliquez vos quotas (liste d’attente automatique au-delà).',
      'Action « accepter les N meilleurs », export PDF prêt pour les régisseurs, raccourcis clavier (↑↓/JK, A accepter, R refuser).',
    ],
  },
  {
    icon: CalendarRange,
    title: 'Lineup & créneaux',
    points: [
      'Ajoutez vos scènes et vos artistes (avec un quota d’interviews optionnel par artiste).',
      'Renseignez les tranches de disponibilité : les créneaux d’interview sont générés automatiquement.',
      'La durée d’interview et le battement entre créneaux se règlent dans les Paramètres.',
    ],
  },
  {
    icon: Newspaper,
    title: 'Communications & newsroom',
    points: [
      'Rédigez des newsletters HTML (aperçu à vos couleurs, variables {{firstName}}…) envoyées aux accrédités.',
      'Publiez vos communiqués de presse sur une newsroom publique partageable.',
      'Importez photos, vidéos, logos et dossiers de presse : les journalistes les téléchargent depuis la newsroom.',
    ],
  },
  {
    icon: Users2,
    title: 'Équipe & rôles',
    points: [
      'Trois niveaux d’accès : admin, attaché de presse, assistant.',
      'Invitez des collaborateurs par email (lien valable 7 jours) et assignez-leur des événements.',
      'Renvoyez ou annulez une invitation en attente à tout moment.',
    ],
  },
  {
    icon: SlidersHorizontal,
    title: 'Paramètres & quotas',
    points: [
      'Clôture des inscriptions, récapitulatifs périodiques à l’équipe.',
      'Quotas par défaut, multiplicateurs par type de demande, poids des médias (pour ajuster le score).',
      'Personnalisez les modèles d’emails, dans chaque langue de l’événement.',
    ],
  },
  {
    icon: UserCheck,
    title: 'Pour les journalistes',
    points: [
      'Remplir le formulaire d’accréditation (consentement RGPD requis).',
      'Accéder à son espace personnel via le lien reçu par email, et soumettre ses demandes.',
      'Suivre le statut de chaque demande et télécharger les médias dans la newsroom.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Sécurité & RGPD',
    points: [
      'Double authentification (TOTP) pour les comptes back-office.',
      'Clés des outils externes chiffrées, mots de passe hachés, échanges en HTTPS.',
      'Droit à l’effacement intégré et politique de confidentialité publique.',
    ],
  },
];

const TIPS: string[] = [
  'Soignez votre lien d’inscription : c’est la première impression. Partagez-le tôt sur vos réseaux et votre site presse.',
  'Définissez des quotas réalistes par artiste et par scène : la liste d’attente gère automatiquement le surplus.',
  'Anticipez la clôture des inscriptions : le compte à rebours public crée un sentiment d’urgence utile.',
  'Demandez (et suivez) l’engagement à créditer l’événement et à transmettre les publications.',
  'Nourrissez la newsroom avant l’événement : communiqués, visuels HD et dossier de presse prêts à télécharger.',
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment fonctionne la notation des demandes (score de priorité) ?',
    a: 'Chaque demande reçoit un score automatique : (poids du média) × (multiplicateur du type) + un bonus d’ancienneté. Vous ajustez ces poids et multiplicateurs dans les Paramètres. Le score classe la file, mais vous gardez toujours la décision finale (accepter / refuser).',
  },
  {
    q: 'Que se passe-t-il quand le quota est atteint pour un artiste ?',
    a: 'Les demandes supplémentaires passent automatiquement en liste d’attente. Dès qu’une demande acceptée est refusée, la meilleure demande en attente (par score) est promue automatiquement.',
  },
  {
    q: 'Comment sont générés les créneaux d’interview ?',
    a: 'Dans « Lineup & créneaux », renseignez les tranches de disponibilité d’un artiste (jour + plage horaire). Les créneaux contigus sont générés selon la durée d’interview et le battement définis dans les Paramètres. Pour les modifier, ajustez les tranches.',
  },
  {
    q: 'Puis-je fermer les inscriptions à une date précise ?',
    a: 'Oui. Dans Paramètres → Clôture des inscriptions, fixez une date/heure. Passé ce délai, le formulaire affiche « inscriptions closes » et refuse les soumissions. Un compte à rebours s’affiche avant la clôture, sur le formulaire et la newsroom.',
  },
  {
    q: 'Comment un journaliste accède-t-il à son espace ?',
    a: 'À l’acceptation de son accréditation, il reçoit un email avec un lien personnel unique (non devinable). Ce lien lui donne accès au lineup et à la soumission de ses demandes, sans mot de passe.',
  },
  {
    q: 'Quels sont les rôles et leurs limites ?',
    a: 'Admin : tous les événements, gestion d’équipe et des clés API. Attaché de presse : ses événements assignés, avec édition complète. Assistant : ses événements assignés, traitement des accréditations et demandes uniquement. Un changement de rôle prend effet à la reconnexion.',
  },
  {
    q: 'Comment envoyer une newsletter ?',
    a: 'Dans « Communications », créez la newsletter (sujet + corps HTML, aperçu à vos couleurs), puis choisissez les destinataires (tous les accrédités ou filtrés par statut). L’envoi se fait via Brevo ; l’historique conserve les envois et brouillons.',
  },
  {
    q: 'Comment partager les médias avec les journalistes ?',
    a: 'Importez vos fichiers dans la Médiathèque. Ils apparaissent dans la newsroom publique, groupés par type (dossier de presse, photos, vidéos, logos), téléchargeables sans connexion.',
  },
  {
    q: 'Comment renvoyer une invitation à un collaborateur ?',
    a: 'Dans « Équipe », chaque invitation en attente a un bouton « Renvoyer » (qui régénère un nouveau lien et renvoie l’email) et un bouton « Annuler ».',
  },
  {
    q: 'Les emails sont-ils réellement envoyés ?',
    a: 'En mode « simulation » (par défaut), tout est journalisé mais rien n’est envoyé. Passez en mode « live » dans Intégrations et renseignez votre clé d’envoi pour des emails réels.',
  },
  {
    q: 'Les destinataires ne reçoivent pas les emails — comment résoudre ?',
    a: 'Vérifiez d’abord le mode « live » et la clé d’envoi dans Intégrations, ainsi que l’expéditeur (une adresse vérifiée chez votre fournisseur d’email). Cause la plus fréquente : le fournisseur (ex. Brevo) bloque les envois depuis une adresse IP non autorisée — l’email est accepté par l’API mais rejeté à la livraison (erreur du type « unrecognised IP address »), sans erreur visible côté plateforme. Solution : dans votre compte d’envoi → Sécurité → « IP autorisées », autorisez l’IP de votre serveur OU, mieux, désactivez la restriction (recommandé si l’IP de sortie de votre hébergeur change à chaque déploiement). Diagnostic : l’onglet « Messages » liste les envois en statut « échec », et le journal d’événements de votre fournisseur précise la raison du rejet.',
  },
  {
    q: 'Comment exercer le droit à l’effacement (RGPD) ?',
    a: 'Chaque ligne d’accréditation dispose d’un bouton « Supprimer (RGPD) » qui efface définitivement le journaliste et toutes ses demandes. Voir aussi notre politique de confidentialité.',
  },
  {
    q: 'Comment exporter les demandes en PDF ?',
    a: 'Chaque vue (file, par artiste, par scène, planning) a un bouton « Exporter en PDF ». Le document reprend votre logo et vos couleurs, prêt à imprimer et à remettre aux régisseurs.',
  },
];

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = guide.icon;
  return (
    <div className="card">
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-tint)',
          color: 'var(--color-accent-strong)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <Icon size={22} strokeWidth={1.7} />
      </span>
      <h3 style={{ fontSize: 'var(--text-lg)', margin: '0 0 var(--space-2)' }}>{guide.title}</h3>
      <ul className="res-list">
        {guide.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/** Centre de ressources public : guides d'utilisation, bonnes pratiques RP et FAQ. */
export function ResourcesPage() {
  return (
    <main className="page" style={{ maxWidth: 880 }}>
      <span className="eyebrow">Ressources</span>
      <h1 style={{ fontSize: 'var(--text-display)', margin: 'var(--space-2) 0 var(--space-3)' }}>
        Centre de ressources
      </h1>
      <p className="muted" style={{ marginBottom: 'var(--space-5)', maxWidth: 620 }}>
        Tout pour prendre en main PR&nbsp;Event&nbsp;360 et orchestrer vos relations presse
        événementielles : guides pas à pas, bonnes pratiques et réponses aux questions fréquentes.
      </p>

      <section className="card stack" style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Démarrage rapide</h2>
        <ol className="res-steps">
          <li>
            <strong>Créez votre événement</strong> — un assistant en 6 étapes (infos, apparence,
            lineup, règles, clôture).
          </li>
          <li>
            <strong>Partagez le lien d’inscription</strong> aux journalistes (réseaux, email, site presse).
          </li>
          <li>
            <strong>Traitez les demandes</strong> — validez les accréditations, puis gérez les
            interviews et reportages.
          </li>
        </ol>
        <Link to="/admin/login" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          Accéder à la plateforme <ArrowRight size={18} />
        </Link>
      </section>

      <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Guides d’utilisation</h2>
      <div className="res-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {GUIDES.map((g) => (
          <GuideCard key={g.title} guide={g} />
        ))}
      </div>

      <section className="card stack" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Bonnes pratiques RP</h2>
        <ul className="res-list">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Questions fréquentes</h2>
      <div className="faq">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <p style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link to="/" className="auth-link">
          ← Retour à l’accueil
        </Link>
        <Link to="/confidentialite" className="auth-link">
          Politique de confidentialité
        </Link>
      </p>
    </main>
  );
}
