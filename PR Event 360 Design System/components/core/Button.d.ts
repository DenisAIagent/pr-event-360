import React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'premium' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Primary call-to-action button for PR Event 360.
 * @startingPoint section="Core" subtitle="Primary, secondary, premium & ghost actions" viewport="700x200"
 */
export function Button(props: ButtonProps): JSX.Element;
