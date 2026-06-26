import React from 'react';

/**
 * PR Event 360 — Tabs
 * Horizontal segmented navigation with an animated active underline in digital blue.
 */
export function Tabs({ items = [], value, onChange = () => {}, style = {}, ...rest }) {
  const active = value ?? items[0]?.value;
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--border-default)',
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const isActive = it.value === active;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: isActive ? 'var(--fw-semibold)' : 'var(--fw-medium)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-body)',
              transition: 'color var(--dur-base) var(--ease-standard)',
            }}
          >
            {it.icon}
            {it.label}
            {it.count != null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 'var(--fw-semibold)',
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-pill)',
                  background: isActive ? 'var(--color-blue-50)' : 'var(--color-gray-100)',
                  color: isActive ? 'var(--color-blue)' : 'var(--text-muted)',
                }}
              >
                {it.count}
              </span>
            )}
            <span
              style={{
                position: 'absolute',
                left: 8,
                right: 8,
                bottom: -1,
                height: 2,
                borderRadius: 2,
                background: 'var(--accent)',
                opacity: isActive ? 1 : 0,
                transition: 'opacity var(--dur-base) var(--ease-standard)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
