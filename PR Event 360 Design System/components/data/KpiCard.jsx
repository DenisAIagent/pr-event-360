import React from 'react';

/**
 * PR Event 360 — KpiCard
 * Dashboard metric tile: fine-line icon, label, large digital-blue figure, optional trend.
 * Big numbers are the brand's signature data treatment.
 */
export function KpiCard({
  label,
  value,
  unit = '',
  icon = null,
  delta = null,          // e.g. "+12%"
  deltaTone = 'success', // success | danger | neutral
  caption = '',
  style = {},
  ...rest
}) {
  const deltaColors = {
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    neutral: 'var(--color-slate)',
  };

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 'var(--fs-micro)',
            fontWeight: 'var(--fw-medium)',
            color: 'var(--text-body)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-blue-50)',
              color: 'var(--color-blue)',
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--fw-semibold)',
            fontSize: 38,
            lineHeight: 1,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 18, fontWeight: 'var(--fw-medium)', color: 'var(--text-accent)' }}>
            {unit}
          </span>
        )}
      </div>

      {(delta || caption) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {delta && (
            <span
              style={{
                fontSize: 'var(--fs-micro)',
                fontWeight: 'var(--fw-semibold)',
                color: deltaColors[deltaTone] || deltaColors.neutral,
              }}
            >
              {delta}
            </span>
          )}
          {caption && (
            <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{caption}</span>
          )}
        </div>
      )}
    </div>
  );
}
