import React from 'react';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional count pill. */
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  /** Active tab value (controlled). */
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/**
 * Horizontal tab navigation with digital-blue active underline.
 * @startingPoint section="Navigation" subtitle="Underlined tabs with count pills" viewport="700x120"
 */
export function Tabs(props: TabsProps): JSX.Element;
