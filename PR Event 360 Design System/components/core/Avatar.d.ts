import React from 'react';

export interface AvatarProps {
  /** Full name — used for initials fallback. */
  name?: string;
  /** Image URL. Falls back to initials when omitted. */
  src?: string | null;
  /** Diameter in px. @default 40 */
  size?: number;
  /** Tint when showing initials. @default "navy" */
  tone?: 'navy' | 'blue' | 'slate';
  style?: React.CSSProperties;
}

/** Circular contact / media avatar with initials fallback. */
export function Avatar(props: AvatarProps): JSX.Element;
