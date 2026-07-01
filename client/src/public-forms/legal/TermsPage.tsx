import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const CONTACT = 'contact@mdmcmusicads.com';

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline';

/**
 * Conditions générales d'utilisation et de vente (CGU/CGV) — abonnement B2B au SaaS
 * PR Event 360. Page publique, française. À faire valider par un conseil juridique.
 */
export function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contrat</span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conditions générales (CGU / CGV)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : juin 2026. En souscrivant un abonnement à PR&nbsp;Event&nbsp;360, le Client
        accepte sans réserve les présentes conditions.
      </p>

      <Separator className="my-6" />

      <div className="space-y-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Objet</h2>
          <p className="leading-relaxed text-muted-foreground">
            Les présentes conditions régissent l'accès et l'utilisation de la plateforme
            «&nbsp;PR&nbsp;Event&nbsp;360&nbsp;» (le «&nbsp;Service&nbsp;»), éditée par MDMC&nbsp;OÜ
            (l'«&nbsp;Éditeur&nbsp;»), permettant aux organisateurs d'événements (le «&nbsp;Client&nbsp;») de
            gérer leurs relations presse&nbsp;: accréditations, demandes d'interview et de reportage, planning,
            newsroom et communications.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Compte et accès</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le Service est réservé aux <strong>professionnels</strong>. La création d'un compte requiert des
            informations exactes. Le Client est responsable de la confidentialité de ses identifiants et de
            toute activité réalisée depuis son compte. Une authentification à deux facteurs est disponible et
            recommandée.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Abonnement, prix et paiement</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le Service est proposé par <strong>abonnement annuel</strong> au tarif indiqué sur la page
            d'inscription (à ce jour <strong>800&nbsp;€&nbsp;HT&nbsp;/&nbsp;an</strong>), tous modules,
            événements et membres d'équipe inclus. Le paiement est traité par notre prestataire{' '}
            <strong>Stripe</strong>&nbsp;; aucune donnée bancaire n'est stockée par l'Éditeur. La TVA
            applicable est ajoutée le cas échéant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Durée, reconduction et résiliation</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'abonnement est conclu pour une durée de <strong>douze (12) mois</strong>, reconductible par
            périodes équivalentes. Le Client peut résilier à tout moment depuis son espace ou en écrivant à{' '}
            <a href={`mailto:${CONTACT}`} className={linkClass}>{CONTACT}</a>&nbsp;; la résiliation prend effet à l'échéance de la
            période en cours, sans remboursement de la période entamée. L'Éditeur peut suspendre ou résilier
            l'accès en cas de manquement grave ou de non-paiement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Droit de rétractation</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le Service s'adressant à des professionnels dans le cadre de leur activité, le droit de
            rétractation de l'article&nbsp;L.221-18 du Code de la consommation ne s'applique pas, sauf cas où
            le Client est un professionnel employant cinq salariés ou moins et que le contrat est hors champ de
            son activité principale.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Disponibilité et support</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du Service et réalise
            des sauvegardes régulières. Le Service est fourni «&nbsp;en l'état&nbsp;»&nbsp;; des interruptions
            pour maintenance ou cas de force majeure peuvent survenir. Le support est assuré par email à{' '}
            <a href={`mailto:${CONTACT}`} className={linkClass}>{CONTACT}</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Obligations du Client</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le Client s'engage à un usage licite du Service, à ne pas porter atteinte aux droits de tiers, et à
            respecter ses obligations en matière de protection des données vis-à-vis des journalistes qu'il
            accrédite (l'Éditeur agissant comme sous-traitant au sens de l'art.&nbsp;28 RGPD&nbsp;; voir la{' '}
            <Link to="/confidentialite" className={linkClass}>politique de confidentialité</Link>).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Propriété intellectuelle</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'Éditeur concède au Client un droit d'usage personnel, non exclusif et non cessible du Service
            pour la durée de l'abonnement. Les contenus créés par le Client (communiqués, médias) restent sa
            propriété&nbsp;; il en garantit la licéité.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">9. Responsabilité</h2>
          <p className="leading-relaxed text-muted-foreground">
            La responsabilité de l'Éditeur, toutes causes confondues, est limitée au montant des sommes versées
            par le Client au titre des douze derniers mois. L'Éditeur n'est pas responsable des dommages
            indirects ni des contenus publiés par le Client.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">10. Droit applicable et litiges</h2>
          <p className="leading-relaxed text-muted-foreground">
            Les présentes conditions sont régies par le droit applicable au siège de l'Éditeur. En cas de
            litige, les parties rechercheront une solution amiable avant toute action&nbsp;; à défaut, le
            litige sera porté devant les tribunaux compétents.
          </p>
        </section>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Ce document constitue un modèle&nbsp;; il est recommandé de le faire valider par un conseil juridique
        avant exploitation commerciale.
      </p>
      <p className="mt-3">
        <Link to="/" className={linkClass}>← Retour à l'accueil</Link>
      </p>
    </main>
  );
}
