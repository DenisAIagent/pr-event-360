import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const CONTACT = 'contact@mdmcmusicads.com';

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline';

/**
 * Mentions légales (éditeur, hébergeur, propriété intellectuelle). Page publique, française.
 * Données société reprises de la politique de confidentialité (MDMC OÜ, Estonie / UE).
 * NB : « directeur de la publication », « capital social » et l'adresse exacte de l'hébergeur
 * sont à confirmer par l'éditeur.
 */
export function LegalNoticePage() {
  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Informations légales
      </span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Mentions légales</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : juin 2026.</p>

      <Separator className="my-6" />

      <div className="space-y-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Éditeur du site</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le site et la plateforme <strong>PR&nbsp;Event&nbsp;360</strong> sont édités par{' '}
            <strong>MDMC&nbsp;OÜ</strong>, société à responsabilité limitée de droit estonien
            (<em>osaühing</em>, Union européenne) au capital social de <strong>2&nbsp;500&nbsp;€</strong>,
            immatriculée le 23&nbsp;mars&nbsp;2022 au registre du commerce estonien sous le numéro{' '}
            <strong>16466485</strong> (D-U-N-S&nbsp;497089049), dont le siège social est situé{' '}
            <strong>Sepapaja tn&nbsp;6, Lasnamäe, 15551 Tallinn, Harju, Estonie</strong>.
            <br />
            Numéro de TVA intracommunautaire&nbsp;: <strong>EE102477612</strong>.
            <br />
            Contact&nbsp;: <a href={`mailto:${CONTACT}`} className={linkClass}>{CONTACT}</a>.
            <br />
            Directeur de la publication&nbsp;: <strong>Denis Adam</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Hébergement</h2>
          <p className="leading-relaxed text-muted-foreground">
            La plateforme est hébergée par <strong>Railway Corporation</strong> (548&nbsp;Market&nbsp;Street,
            San&nbsp;Francisco, CA&nbsp;94104, États-Unis) sur une infrastructure située au sein de l'Union
            européenne. Les médias sont hébergés par <strong>Cloudinary</strong> et les emails acheminés par{' '}
            <strong>Brevo</strong> (Union européenne).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Propriété intellectuelle</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'ensemble des éléments de la plateforme (marque «&nbsp;PR&nbsp;Event&nbsp;360&nbsp;», logo, code,
            interface, textes, graphismes) est protégé par le droit de la propriété intellectuelle et demeure
            la propriété exclusive de MDMC&nbsp;OÜ, sauf mention contraire. Toute reproduction, représentation
            ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite. Les
            contenus publiés par les organisateurs d'événements (communiqués, médias, logos) restent la
            propriété de leurs titulaires respectifs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Responsabilité</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'éditeur s'efforce d'assurer l'exactitude et la disponibilité des informations, sans garantie. Il
            ne saurait être tenu responsable des contenus publiés par les organisateurs via la plateforme, ni
            des dommages résultant d'une indisponibilité technique ou d'un usage non conforme du service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Données personnelles & cookies</h2>
          <p className="leading-relaxed text-muted-foreground">
            Le traitement des données personnelles est décrit dans notre{' '}
            <Link to="/confidentialite" className={linkClass}>politique de confidentialité</Link>. La
            plateforme n'utilise aucun traceur publicitaire ou analytique&nbsp;; seul un stockage local
            strictement nécessaire au fonctionnement est employé.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Droit applicable</h2>
          <p className="leading-relaxed text-muted-foreground">
            Les présentes mentions sont régies par le droit applicable au siège de l'éditeur. Pour les
            conditions de vente du service, voir nos{' '}
            <Link to="/cgv" className={linkClass}>conditions générales</Link>.
          </p>
        </section>
      </div>

      <p className="mt-10">
        <Link to="/" className={linkClass}>← Retour à l'accueil</Link>
      </p>
    </main>
  );
}
