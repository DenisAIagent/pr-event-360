/**
 * Icônes fines (SVG, `currentColor`) remplaçant les emoji — conformément au design
 * system PR Event 360 (« le statut vient des badges, des icônes fines et de la
 * couleur — jamais d'emoji »). Taille par défaut 1em : l'icône suit la typo.
 */
export type IconName =
  | 'clock'
  | 'newspaper'
  | 'download'
  | 'check'
  | 'check-circle'
  | 'close'
  | 'monitor'
  | 'smartphone';

const PATHS: Record<IconName, React.ReactNode> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  newspaper: (
    <>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5z" />
      <path d="M17 8h3v9a2 2 0 0 1-2 2" />
      <path d="M7 9h7M7 12h7M7 15h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = '1em', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0, verticalAlign: '-0.15em', ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}
