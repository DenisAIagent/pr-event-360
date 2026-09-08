import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import './landing.css';
import { LandingHeader } from './LandingHeader';
import { HeroSection } from './sections/HeroSection';
import { ProfilesStrip } from './sections/ProfilesStrip';
import { DemoSection, FeaturesSection } from './sections/FeaturesSection';
import { CycleBand } from './sections/CycleBand';
import { ReviewsSection, type PublicReview } from './sections/ReviewsSection';
import { PricingSection } from './sections/PricingSection';
import { ClosingCta } from './sections/ClosingCta';
import { LandingFooter } from './sections/LandingFooter';

/**
 * Page marketing publique (racine du site).
 *
 * Composition éditoriale : photographie plein cadre en ouverture, contenu calme
 * sur canvas chaud, une seule bande bleu nuit pour rompre le rythme, halos bleus
 * avant le pied de page. Palette et typographies du design system PR Event 360.
 */
export function LandingPage() {
  usePageTitle('PR Event 360 — Votre orchestrateur de relations presse');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  useEffect(() => {
    api
      .get<PublicReview[]>('/public/reviews')
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  return (
    <div className="lp">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProfilesStrip />
        <DemoSection />
        <FeaturesSection />
        <CycleBand />
        <ReviewsSection reviews={reviews} />
        <PricingSection />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
