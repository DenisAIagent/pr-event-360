import { Link } from 'react-router-dom';

// Contact RGPD (boîte surveillée par l'organisation).
const PRIVACY_CONTACT = 'rgpd@mdmcmusicads.com';

/**
 * Politique de confidentialité (RGPD, art. 13). Page publique, française.
 * Reflète l'architecture cible conforme : hébergement UE, sous-traitants encadrés.
 */
export function PrivacyPage() {
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Protection des données</span>
      <h1 style={{ fontSize: 'var(--text-display)', margin: 'var(--space-2) 0 var(--space-3)' }}>
        Politique de confidentialité
      </h1>
      <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
        Dernière mise à jour : juin 2026. Cette politique décrit comment vos données personnelles sont
        traitées lorsque vous demandez une accréditation presse via PR&nbsp;Event&nbsp;360.
      </p>

      <section className="stack" style={{ gap: 'var(--space-5)' }}>
        <div>
          <h2>1. Responsable de traitement</h2>
          <p>
            Le responsable du traitement est <strong>l'organisateur de l'événement</strong> auquel vous
            demandez votre accréditation. La plateforme PR&nbsp;Event&nbsp;360 est éditée par{' '}
            <strong>MDMC&nbsp;OÜ</strong>, société de droit estonien (Union européenne), immatriculée au
            registre du commerce estonien sous le n°&nbsp;16466485, siège : Sepapaja tn 6, 15551 Tallinn,
            Estonie, qui agit en tant que <strong>sous-traitant technique</strong> (art. 28 RGPD) pour le
            compte de cet organisateur.
            Pour toute question relative à vos données : <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.
          </p>
        </div>

        <div>
          <h2>2. Données collectées</h2>
          <p>
            Lors de votre demande d'accréditation : prénom, nom, adresse email, téléphone (facultatif), média
            représenté, audience/tirage (facultatif), type d'accréditation, lien vers une publication
            antérieure (facultatif) et le contenu de vos demandes d'interview ou de reportage. Aucune donnée
            sensible (art.&nbsp;9 RGPD) n'est collectée.
          </p>
        </div>

        <div>
          <h2>3. Finalités et base légale</h2>
          <ul className="stack" style={{ gap: 'var(--space-1)', paddingLeft: '1.1rem' }}>
            <li>
              <strong>Gestion de votre demande d'accréditation et de vos demandes d'interview/reportage</strong> —
              base légale&nbsp;: exécution de mesures précontractuelles et du contrat (art.&nbsp;6.1.b).
            </li>
            <li>
              <strong>Communications liées à l'événement</strong> (confirmation, lien personnel, informations
              pratiques) — base légale&nbsp;: intérêt légitime de l'organisateur (art.&nbsp;6.1.f).
            </li>
            <li>
              <strong>Priorisation des demandes</strong> — un score d'aide à la décision est calculé pour
              classer les demandes&nbsp;; la décision d'accepter ou refuser est <strong>prise par un humain</strong>{' '}
              (pas de décision exclusivement automatisée au sens de l'art.&nbsp;22).
            </li>
          </ul>
        </div>

        <div>
          <h2>4. Destinataires et sous-traitants</h2>
          <p>
            Vos données sont accessibles à l'équipe presse de l'organisateur. Nous faisons appel à des
            sous-traitants offrant des garanties appropriées&nbsp;: <strong>Brevo</strong> (envoi d'emails,
            Union européenne), <strong>Cloudinary</strong> (hébergement des médias) et l'hébergeur de la
            plateforme. Les données sont hébergées au sein de l'<strong>Union européenne</strong>. Lorsqu'un
            sous-traitant traite des données hors UE, le transfert est encadré par une décision d'adéquation,
            le Data&nbsp;Privacy&nbsp;Framework ou des clauses contractuelles types (art.&nbsp;44-49 RGPD).
          </p>
        </div>

        <div>
          <h2>5. Durée de conservation</h2>
          <p>
            Vos données d'accréditation sont conservées pendant la durée de l'événement, puis pour une durée
            maximale de <strong>12 mois</strong> à des fins de gestion et de suivi, avant suppression ou
            anonymisation.
          </p>
        </div>

        <div>
          <h2>6. Vos droits</h2>
          <p>
            Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'<strong>accès</strong>, de{' '}
            <strong>rectification</strong>, d'<strong>effacement</strong>, de <strong>limitation</strong>,
            d'<strong>opposition</strong> et de <strong>portabilité</strong> de vos données. Pour les exercer,
            écrivez à <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. Vous pouvez également
            introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a>.
          </p>
        </div>

        <div>
          <h2>7. Cookies et traceurs</h2>
          <p>
            La plateforme n'utilise <strong>aucun traceur publicitaire ou analytique</strong>. Seul un stockage
            local strictement nécessaire au fonctionnement (session, préférences) est employé&nbsp;: il est
            exempté de consentement.
          </p>
        </div>

        <div>
          <h2>8. Sécurité</h2>
          <p>
            Les mots de passe sont hachés (argon2), les clés des outils tiers sont chiffrées (AES-256-GCM),
            les échanges sont chiffrés en transit (HTTPS), et l'accès est restreint aux personnes habilitées.
          </p>
        </div>
      </section>

      <p style={{ marginTop: 'var(--space-6)' }}>
        <Link to="/" className="auth-link">
          ← Retour à l'accueil
        </Link>
      </p>
    </main>
  );
}
