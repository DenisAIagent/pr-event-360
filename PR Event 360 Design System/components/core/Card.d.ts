import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  /** Inner padding in px. @default 24 */
  padding?: number;
  /** Lift on hover (for clickable cards). @default false */
  interactive?: boolean;
  /** Add a digital-blue top accent rule. @default false */
  accent?: boolean;
  style?: React.CSSProperties;
}

/**
 * Surface container — white, hairline border, soft shadow, 16px radius.
 * @startingPoint section="Core" subtitle="Default content surface" viewport="700x180"
 */
export function Card(props: CardProps): JSX.Element;
