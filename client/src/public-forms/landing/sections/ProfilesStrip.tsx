import { EVENT_PROFILES } from '../content';

/** Les profils d'événement pris en charge, avec le vocabulaire que le produit adopte. */
export function ProfilesStrip() {
  return (
    <section className="lp-strip" aria-labelledby="lp-strip-title">
      <div className="lp-wrap">
        <span id="lp-strip-title" className="lp-strip-label">
          Un vocabulaire adapté à chaque type d'événement
        </span>
        <ul className="lp-strip-grid" role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {EVENT_PROFILES.map(([name, vocab]) => (
            <li key={name} className="lp-strip-cell">
              <strong>{name}</strong>
              <span>{vocab}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
