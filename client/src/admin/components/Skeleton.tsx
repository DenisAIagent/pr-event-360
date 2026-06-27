/** Bloc squelette (effet shimmer) pour le chargement — perçu plus rapide qu'un texte. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--radius-sm)',
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
  style?: React.CSSProperties;
}) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

/** Grille de cartes-squelettes (listes d'événements, KPIs, demandes…). */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={13} style={{ marginTop: 10 }} />
          <Skeleton width="100%" height={36} radius="var(--radius-md)" style={{ marginTop: 16 }} />
        </div>
      ))}
    </div>
  );
}

/** Lignes-squelettes (files de demandes, listes). */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ padding: 'var(--space-3)' }}>
          <Skeleton width="45%" height={16} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}
