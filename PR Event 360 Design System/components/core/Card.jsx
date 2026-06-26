import React from 'react';

/**
 * PR Event 360 — Card
 * White surface, hairline border, very light shadow, 16px radius, 24px padding.
 * The default content container across the SaaS UI.
 */
export function Card({
  children,
  padding = 24,
  interactive = false,
  accent = false,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding,
        transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
        ...(accent ? { borderTop: '3px solid var(--accent)' } : null),
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
