import React from 'react';

/**
 * PR Event 360 — Button
 * Variants: primary (digital blue), secondary (outline), premium (navy), ghost.
 * Sizes: sm, md, lg. Optional leading/trailing icon (pass a node).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leadingIcon = null,
  trailingIcon = null,
  fullWidth = false,
  disabled = false,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '7px 14px', fontSize: '14px', height: 34, gap: 6, radius: 8 },
    md: { padding: '10px 18px', fontSize: '15px', height: 42, gap: 8, radius: 10 },
    lg: { padding: '13px 24px', fontSize: '16px', height: 50, gap: 9, radius: 12 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--accent-contrast)',
      border: '1px solid var(--accent)',
      boxShadow: 'var(--shadow-accent)',
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
      boxShadow: 'none',
    },
    premium: {
      background: 'var(--color-navy)',
      color: 'var(--text-inverse)',
      border: '1px solid var(--color-navy)',
      boxShadow: 'var(--shadow-sm)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-accent)',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        width: fullWidth ? '100%' : 'auto',
        padding: s.padding,
        minHeight: s.height,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--fw-medium)',
        fontSize: s.fontSize,
        lineHeight: 1,
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--dur-fast) var(--ease-standard), background var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
