import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Status tone. @default "neutral" */
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'navy';
  /** Show a leading status dot. @default false */
  dot?: boolean;
  style?: React.CSSProperties;
}

/**
 * Status badge for accreditations, follow-ups and media tags.
 * @startingPoint section="Core" subtitle="Accrédité · À relancer · Refusé · VIP" viewport="700x140"
 */
export function Badge(props: BadgeProps): JSX.Element;
