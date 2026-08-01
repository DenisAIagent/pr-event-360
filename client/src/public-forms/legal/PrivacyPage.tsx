import { Link } from 'react-router-dom';
import { usePageTitle } from '../../lib/usePageTitle';

// Contact RGPD (boîte surveillée par l'organisation).
const PRIVACY_CONTACT = 'rgpd@mdmcmusicads.com';

/**
 * Politique de confidentialité (RGPD, art. 13). Page publique, française.
 * Couvre le parcours journaliste (RT = organisateur) et les comptes SaaS (RT = MDMC OÜ).
 */
export function PrivacyPage() {
  usePageTitle('Politique de confidentialité — PR Event 360');
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Protection des données</span>
      <h1 style={{ fontSize: 'var(--text-display)', margin: 'var(--space-2) 0 var(--space-3)' }}>
        Politique de confidentialité
      </h1>
      <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
        Dernière mise à jour : août 2026. Cette politique décrit comment les données personnelles sont
        traitées lorsque vous utilisez PR&nbsp;Event&nbsp;360 (accréditation presse, espace journaliste,
        comptes organisateurs et facturation).
      </p>

      <section className="stack" style={{ gap: 'var(--space-5)' }}>
        <div>
          <h2>1. Responsables de traitement</h2>
          <p>
            <strong>Journalistes et accréditations :</strong> le responsable du traitement est{' '}
            <strong>l'organisateur de l'événement</strong> auquel vous demandez votre accréditation.
            La plateforme PR&nbsp;Event&nbsp;360 est éditée par <strong>MDMC&nbsp;OÜ</strong>, société de
            droit estonien (UE), immatriculée sous le n°&nbsp;16466485, siège : Sepapaja tn 6, 15551 Tallinn,
            Estonie, qui agit en tant que <strong>sous-traitant technique</strong> (art.&nbsp;28 RGPD) pour
            le compte de cet organisateur.
          </p>
          <p>
            <strong>Comptes organisateurs, facturation SaaS et prospection MDMC :</strong> MDMC&nbsp;OÜ agit
            en tant que <strong>responsable de traitement</strong> pour les données de ses clients et
            prospects (création de compte, abonnement, support).
          </p>
          <p>
            Contact : <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.
          </p>
        </div>

        <div>
          <h2>2. Données collectées</h2>
          <p>
            <strong>Accréditation / espace journaliste :</strong> prénom, nom, email, téléphone (facultatif),
            média, audience/tirage (facultatif), type d'accréditation, lien vers une publication antérieure
            (facultatif), contenu des demandes d'interview ou de reportage, inscriptions aux conférences,
            retombées déposées et consentements associés.
          </p>
          <p>
            <strong>Comptes back-office :</strong> email, nom, rôle, organisation, hash de mot de passe ou
            identifiant Google, état MFA, traces d'audit techniques.
          </p>
          <p>
            <strong>Facturation :</strong> identité de facturation et références Stripe (les données bancaires
            sont traitées par Stripe, non stockées par MDMC&nbsp;OÜ).
          </p>
          <p>Aucune donnée sensible (art.&nbsp;9 RGPD) n'est requise par le produit.</p>
        </div>

        <div>
          <h2>3. Finalités et bases légales</h2>
          <ul className="stack" style={{ gap: 'var(--space-1)', paddingLeft: '1.1rem' }}>
            <li>
              <strong>Gestion de l'accréditation et des demandes d'interview/reportage</strong> — base
              légale&nbsp;: mesures précontractuelles et exécution du contrat (art.&nbsp;6.1.b). La case
              cochée à l'inscription matérialise l'information et l'acceptation du traitement de votre
              dossier ; elle n'est pas le seul fondement juridique.
            </li>
            <li>
              <strong>Communications liées à l'événement</strong> (confirmation, lien d'accès, informations
              pratiques) — base légale&nbsp;: intérêt légitime de l'organisateur (art.&nbsp;6.1.f), documenté
              par un balancing test.
            </li>
            <li>
              <strong>Priorisation des demandes</strong> — score d'aide au classement ; la décision d'accepter
              ou refuser est <strong>prise par un humain</strong> (pas de décision exclusivement automatisée
              au sens de l'art.&nbsp;22).
            </li>
            <li>
              <strong>Usages promotionnels des médias uploadés</strong> dans la revue de presse — consentement
              distinct (art.&nbsp;6.1.a), retirable.
            </li>
            <li>
              <strong>Comptes, sécurité, facturation SaaS</strong> — contrat (art.&nbsp;6.1.b) et, le cas
              échéant, obligation légale comptable (art.&nbsp;6.1.c).
            </li>
          </ul>
        </div>

        <div>
          <h2>4. Destinataires et sous-traitants</h2>
          <p>
            Vos données sont accessibles à l'équipe presse de l'organisateur (pour les traitements d'événement)
            et aux sous-traitants techniques de MDMC&nbsp;OÜ offrant des garanties appropriées&nbsp;:{' '}
            <strong>Railway</strong> (hébergement), <strong>Brevo</strong> (emails),{' '}
            <strong>Cloudinary</strong> (médias), <strong>Stripe</strong> (paiement), éventuellement{' '}
            <strong>Twilio</strong> (SMS), <strong>Google Identity</strong> (connexion) et{' '}
            <strong>Sentry</strong> (erreurs techniques). Les régions et mécanismes de transfert sont documentés
            dans le dossier de conformité et mis à jour à chaque activation de fournisseur.
          </p>
        </div>

        <div>
          <h2>5. Durée de conservation</h2>
          <p>
            Données d'accréditation&nbsp;: durée de l'événement puis <strong>12 mois maximum</strong>, avec
            purge automatique. Journaux d'audit et notifications&nbsp;: 12 mois. Comptes organisateurs&nbsp;:
            durée de la relation contractuelle et délais légaux applicables. Sauvegardes techniques&nbsp;:
            rétention limitée et chiffrée selon la procédure d'exploitation.
          </p>
        </div>

        <div>
          <h2>6. Vos droits</h2>
          <p>
            Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'<strong>accès</strong>, de{' '}
            <strong>rectification</strong>, d'<strong>effacement</strong>, de <strong>limitation</strong>,
            d'<strong>opposition</strong> et de <strong>portabilité</strong>. Pour les exercer, écrivez à{' '}
            <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> ou utilisez les fonctions d'export /
            suppression de l'espace journaliste et du back-office. Vous pouvez introduire une réclamation
            auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a> ou de
            l'autorité de contrôle de votre pays de résidence dans l'EEE.
          </p>
        </div>

        <div>
          <h2>7. Cookies et traceurs</h2>
          <p>
            La plateforme n'utilise <strong>aucun traceur publicitaire ou analytique</strong>. Cookies
            strictement nécessaires&nbsp;:
          </p>
          <ul className="stack" style={{ gap: 'var(--space-1)', paddingLeft: '1.1rem' }}>
            <li>
              <code>pr360_session</code> — session back-office (HttpOnly) ;
            </li>
            <li>
              <code>pr360_csrf</code> — protection CSRF double-submit ;
            </li>
            <li>
              <code>pr360_journalist</code> — session espace journaliste (HttpOnly), posée après le lien
              magique ou le login.
            </li>
          </ul>
          <p>Ces cookies sont exemptés de consentement (finalité purement technique). Sentry, s'il est
            activé, est configuré sans PII par défaut (<code>sendDefaultPii=false</code>).</p>
        </div>

        <div>
          <h2>8. Sécurité</h2>
          <p>
            Mots de passe hachés (Argon2, 12 caractères minimum), clés d'intégration chiffrées (AES-256-GCM),
            échanges HTTPS, MFA TOTP obligatoire pour les administrateurs, isolation multi-tenant, rate-limits
            et journal d'audit.
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
