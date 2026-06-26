import React from 'react';

/**
 * PR Event 360 — Badge
 * Status pills for accreditations, follow-ups, cancellations, VIP/key media.
 * Tone presets map to the charter's badge system.
 */
export function Badge({ children, tone = 'neutral', dot = false, style = {}, ...rest }) {
  const tones = {
    success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' },   // Accrédité
    warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' },   // À relancer
    danger:  { bg: 'var(--color-danger-bg)',  fg: 'var(--color-danger)' },    // Refusé / Annulé
    info:    { bg: 'var(--color-blue-50)',    fg: 'var(--color-blue)' },       // VIP / Média clé
    neutral: { bg: 'var(--color-gray-100)',   fg: 'var(--color-slate)' },
    navy:    { bg: 'rgba(7,20,47,0.06)',      fg: 'var(--color-navy)' },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--font-sans)',
        fontSize: '12.5px',
        fontWeight: 'var(--fw-medium)',
        lineHeight: 1.3,
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.fg, flexShrink: 0 }} />
      )}
      {children}
    </span>
  );
}
