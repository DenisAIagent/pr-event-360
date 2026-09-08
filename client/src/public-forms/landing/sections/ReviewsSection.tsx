import { Star } from 'lucide-react';
import { Reveal } from '../motion';

export interface PublicReview {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  rating: number;
  quote: string;
}

/** Avis publiés (API). Le libellé ne doit pas surpromettre : les avis incluent des
 *  retours d'attachés de presse du secteur, pas uniquement des clients. */
export function ReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;
  const single = reviews.length === 1;
  return (
    <section id="testimonial" className="lp-section lp-section-line" aria-labelledby="lp-reviews-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <span className="eyebrow">Ce qu'en disent les attachés de presse</span>
            <h2 id="lp-reviews-title" className="lp-h2">
              Des retours du terrain
            </h2>
          </div>
        </div>
        <div className={`lp-quotes${single ? ' is-single' : ''}`}>
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={i * 70}>
              <figure className="lp-card lp-quote">
                <div className="lp-stars" aria-label={`${r.rating}/5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={16}
                      fill={n <= r.rating ? 'var(--lp-star)' : 'none'}
                      color={n <= r.rating ? 'var(--lp-star)' : 'var(--lp-star-empty)'}
                    />
                  ))}
                </div>
                <blockquote>
                  <span className="lp-accent">«&nbsp;</span>
                  {r.quote}
                  <span className="lp-accent">&nbsp;»</span>
                </blockquote>
                <figcaption>
                  <strong>{r.authorName}</strong>
                  {(r.authorRole || r.authorOrg) &&
                    ` · ${[r.authorRole, r.authorOrg].filter(Boolean).join(', ')}`}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
