import React from 'react';

/**
 * PR Event 360 — Avatar
 * Circular media/contact identity. Image or initials fallback on a soft tint.
 */
export function Avatar({ name = '', src = null, size = 40, tone = 'navy', style = {}, ...rest }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const tones = {
    navy: { bg: 'rgba(7,20,47,0.06)', fg: 'var(--color-navy)' },
    blue: { bg: 'var(--color-blue-50)', fg: 'var(--color-blue)' },
    slate: { bg: 'var(--color-gray-100)', fg: 'var(--color-slate)' },
  };
  const t = tones[tone] || tones.navy;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--fw-semibold)',
        fontSize: Math.round(size * 0.38),
        letterSpacing: '0.01em',
        border: '1px solid var(--border-default)',
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials || '•'
      )}
    </span>
  );
}
