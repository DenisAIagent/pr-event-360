import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  containerStyle?: React.CSSProperties;
}

/**
 * Labelled text input with digital-blue focus ring and error state.
 * @startingPoint section="Forms" subtitle="Labelled field with focus + error states" viewport="700x160"
 */
export function Input(props: InputProps): JSX.Element;
