import type { LucideIcon } from 'lucide-react';
import { FEATURES } from '../content';
import { Reveal } from '../motion';
import { VideoShowcase } from '../VideoShowcase';

/** Tuile d'icône bleu-tint (motif du design system). */
function IconTile({ icon: Ic }: { icon: LucideIcon }) {
  return (
    <span className="lp-icon-tile">
      <Ic size={21} strokeWidth={1.75} />
    </span>
  );
}

export function DemoSection() {
  return (
    <section id="demo" className="lp-section lp-section-line" aria-labelledby="lp-demo-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <span className="eyebrow">La plateforme en une minute</span>
            <h2 id="lp-demo-title" className="lp-h2">
              Voyez PR Event 360 en action
            </h2>
          </div>
          <p className="lp-lede">
            Du premier mail d'invitation à la revue de presse : le parcours complet, en moins d'une
            minute.
          </p>
        </div>
        <Reveal>
          <VideoShowcase />
        </Reveal>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="lp-section" aria-labelledby="lp-features-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <span className="eyebrow">Une plateforme, tout le cycle RP</span>
            <h2 id="lp-features-title" className="lp-h2">
              De l'invitation à la retombée média
            </h2>
          </div>
          <p className="lp-lede">
            Coordonnez chaque étape de vos relations presse événementielles depuis un seul outil,
            clair et structuré.
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(([Ic, title, desc], i) => (
            <Reveal key={title} delay={i * 70}>
              <article className="lp-card lp-feature">
                <IconTile icon={Ic} />
                <h3 className="lp-h3">{title}</h3>
                <p className="lp-body">{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
