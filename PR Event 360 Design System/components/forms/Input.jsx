import React from 'react';

/**
 * PR Event 360 — Input
 * Labelled text field. Hairline border, soft focus ring in digital blue.
 */
export function Input({
  label,
  hint,
  error,
  leadingIcon = null,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const [focused, setFocused] = React.useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--fs-micro)',
            fontWeight: 'var(--fw-medium)',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          background: 'var(--surface-card)',
          border: `1px solid ${error ? 'var(--color-danger)' : focused ? 'var(--border-focus)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-sm)',
          boxShadow: focused && !error ? 'var(--ring-accent)' : 'none',
          transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
        }}
      >
        {leadingIcon && (
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', flexShrink: 0 }}>
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '10px 0',
            fontFamily: 'var(--font-sans)',
            fontSize: '15px',
            color: 'var(--text-primary)',
            ...style,
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span
          style={{
            fontSize: 'var(--fs-micro)',
            color: error ? 'var(--color-danger)' : 'var(--text-muted)',
          }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
