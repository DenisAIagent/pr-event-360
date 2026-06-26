import React from 'react';

export interface KpiCardProps {
  /** Metric label, e.g. "Journalistes invités". */
  label: string;
  /** The figure — string or number. */
  value: string | number;
  /** Optional unit/suffix shown in accent blue, e.g. "%". */
  unit?: string;
  /** Fine-line icon node (Lucide). */
  icon?: React.ReactNode;
  /** Trend text, e.g. "+12%". */
  delta?: string;
  /** @default "success" */
  deltaTone?: 'success' | 'danger' | 'neutral';
  /** Small caption under the figure. */
  caption?: string;
  style?: React.CSSProperties;
}

/**
 * Dashboard KPI tile with a large figure — the brand's signature metric treatment.
 * @startingPoint section="Data" subtitle="Big-figure dashboard metric" viewport="700x200"
 */
export function KpiCard(props: KpiCardProps): JSX.Element;
