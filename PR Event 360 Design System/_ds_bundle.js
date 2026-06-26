/* @ds-bundle: {"format":3,"namespace":"PREvent360DesignSystem_82909b","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"KpiCard","sourcePath":"components/data/KpiCard.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"a8ae20116ff3","components/core/Badge.jsx":"7f01af8fe43f","components/core/Button.jsx":"b1f6d7e2801b","components/core/Card.jsx":"e4424489c299","components/data/KpiCard.jsx":"730902a9eb91","components/forms/Input.jsx":"171360db04d4","components/navigation/Tabs.jsx":"37e6a054a6be","ui_kits/app/screens.jsx":"0aef3714c19d","ui_kits/app/screens2.jsx":"871ae6c974be","ui_kits/app/shell.jsx":"50edd26767d6","ui_kits/website/site.jsx":"1e7eb953c9ad"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PREvent360DesignSystem_82909b = window.PREvent360DesignSystem_82909b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Avatar
 * Circular media/contact identity. Image or initials fallback on a soft tint.
 */
function Avatar({
  name = '',
  src = null,
  size = 40,
  tone = 'navy',
  style = {},
  ...rest
}) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  const tones = {
    navy: {
      bg: 'rgba(7,20,47,0.06)',
      fg: 'var(--color-navy)'
    },
    blue: {
      bg: 'var(--color-blue-50)',
      fg: 'var(--color-blue)'
    },
    slate: {
      bg: 'var(--color-gray-100)',
      fg: 'var(--color-slate)'
    }
  };
  const t = tones[tone] || tones.navy;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials || '•');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Badge
 * Status pills for accreditations, follow-ups, cancellations, VIP/key media.
 * Tone presets map to the charter's badge system.
 */
function Badge({
  children,
  tone = 'neutral',
  dot = false,
  style = {},
  ...rest
}) {
  const tones = {
    success: {
      bg: 'var(--color-success-bg)',
      fg: 'var(--color-success)'
    },
    // Accrédité
    warning: {
      bg: 'var(--color-warning-bg)',
      fg: 'var(--color-warning)'
    },
    // À relancer
    danger: {
      bg: 'var(--color-danger-bg)',
      fg: 'var(--color-danger)'
    },
    // Refusé / Annulé
    info: {
      bg: 'var(--color-blue-50)',
      fg: 'var(--color-blue)'
    },
    // VIP / Média clé
    neutral: {
      bg: 'var(--color-gray-100)',
      fg: 'var(--color-slate)'
    },
    navy: {
      bg: 'rgba(7,20,47,0.06)',
      fg: 'var(--color-navy)'
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.fg,
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Button
 * Variants: primary (digital blue), secondary (outline), premium (navy), ghost.
 * Sizes: sm, md, lg. Optional leading/trailing icon (pass a node).
 */
function Button({
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
    sm: {
      padding: '7px 14px',
      fontSize: '14px',
      height: 34,
      gap: 6,
      radius: 8
    },
    md: {
      padding: '10px 18px',
      fontSize: '15px',
      height: 42,
      gap: 8,
      radius: 10
    },
    lg: {
      padding: '13px 24px',
      fontSize: '16px',
      height: 50,
      gap: 9,
      radius: 12
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--accent-contrast)',
      border: '1px solid var(--accent)',
      boxShadow: 'var(--shadow-accent)'
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
      boxShadow: 'none'
    },
    premium: {
      background: 'var(--color-navy)',
      color: 'var(--text-inverse)',
      border: '1px solid var(--color-navy)',
      boxShadow: 'var(--shadow-sm)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-accent)',
      border: '1px solid transparent',
      boxShadow: 'none'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'translateY(1px)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'translateY(0)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'translateY(0)';
    }
  }, rest), leadingIcon, children, trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Card
 * White surface, hairline border, very light shadow, 16px radius, 24px padding.
 * The default content container across the SaaS UI.
 */
function Card({
  children,
  padding = 24,
  interactive = false,
  accent = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding,
      transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
      ...(accent ? {
        borderTop: '3px solid var(--accent)'
      } : null),
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = 'var(--border-strong)';
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = 'var(--border-default)';
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/KpiCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — KpiCard
 * Dashboard metric tile: fine-line icon, label, large digital-blue figure, optional trend.
 * Big numbers are the brand's signature data treatment.
 */
function KpiCard({
  label,
  value,
  unit = '',
  icon = null,
  delta = null,
  // e.g. "+12%"
  deltaTone = 'success',
  // success | danger | neutral
  caption = '',
  style = {},
  ...rest
}) {
  const deltaColors = {
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    neutral: 'var(--color-slate)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-body)',
      letterSpacing: '0.01em'
    }
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-blue-50)',
      color: 'var(--color-blue)',
      flexShrink: 0
    }
  }, icon)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 38,
      lineHeight: 1,
      color: 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em'
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-accent)'
    }
  }, unit)), (delta || caption) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, delta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-semibold)',
      color: deltaColors[deltaTone] || deltaColors.neutral
    }
  }, delta), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-micro)',
      color: 'var(--text-muted)'
    }
  }, caption)));
}
Object.assign(__ds_scope, { KpiCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KpiCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Input
 * Labelled text field. Hairline border, soft focus ring in digital blue.
 */
function Input({
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
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px',
      background: 'var(--surface-card)',
      border: `1px solid ${error ? 'var(--color-danger)' : focused ? 'var(--border-focus)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focused && !error ? 'var(--ring-accent)' : 'none',
      transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)'
    }
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      display: 'inline-flex',
      flexShrink: 0
    }
  }, leadingIcon), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      padding: '10px 0',
      fontFamily: 'var(--font-sans)',
      fontSize: '15px',
      color: 'var(--text-primary)',
      ...style
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-micro)',
      color: error ? 'var(--color-danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PR Event 360 — Tabs
 * Horizontal segmented navigation with an animated active underline in digital blue.
 */
function Tabs({
  items = [],
  value,
  onChange = () => {},
  style = {},
  ...rest
}) {
  const active = value ?? items[0]?.value;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-default)',
      ...style
    }
  }, rest), items.map(it => {
    const isActive = it.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange(it.value),
      style: {
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
        transition: 'color var(--dur-base) var(--ease-standard)'
      }
    }, it.icon, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 'var(--fw-semibold)',
        padding: '1px 7px',
        borderRadius: 'var(--radius-pill)',
        background: isActive ? 'var(--color-blue-50)' : 'var(--color-gray-100)',
        color: isActive ? 'var(--color-blue)' : 'var(--text-muted)'
      }
    }, it.count), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: -1,
        height: 2,
        borderRadius: 2,
        background: 'var(--accent)',
        opacity: isActive ? 1 : 0,
        transition: 'opacity var(--dur-base) var(--ease-standard)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens.jsx
try { (() => {
/* PR Event 360 — App screens: Dashboard, Contacts, Events */

const S_NS = window.PREvent360DesignSystem_82909b;

// ---------- shared data ----------
const CONTACTS = [{
  name: 'Camille Roy',
  media: 'Le Monde',
  beat: 'Culture',
  status: 'success',
  label: 'Accrédité',
  vip: true,
  last: 'il y a 2 j'
}, {
  name: 'Thomas Bernard',
  media: 'France Inter',
  beat: 'Société',
  status: 'warning',
  label: 'À relancer',
  vip: false,
  last: 'il y a 6 j'
}, {
  name: 'Léa Fontaine',
  media: 'Les Échos',
  beat: 'Économie',
  status: 'success',
  label: 'Accrédité',
  vip: true,
  last: 'hier'
}, {
  name: 'Marc Dubois',
  media: 'AFP',
  beat: 'Général',
  status: 'info',
  label: 'Invité',
  vip: false,
  last: 'il y a 3 j'
}, {
  name: 'Sophie Marchand',
  media: 'Télérama',
  beat: 'Culture',
  status: 'danger',
  label: 'Refusé',
  vip: false,
  last: 'il y a 8 j'
}, {
  name: 'Julien Petit',
  media: 'BFM TV',
  beat: 'Actualité',
  status: 'warning',
  label: 'À relancer',
  vip: true,
  last: 'il y a 5 j'
}];
const EVENTS = [{
  name: 'Salon Tech & Médias 2026',
  date: '14 sept. 2026',
  city: 'Paris · Porte de Versailles',
  invited: 247,
  accredited: 42,
  status: 'En cours'
}, {
  name: 'Conférence de presse — Lancement',
  date: '28 sept. 2026',
  city: 'Paris · Station F',
  invited: 86,
  accredited: 61,
  status: 'Confirmé'
}, {
  name: 'Cocktail presse — Rentrée',
  date: '03 oct. 2026',
  city: 'Lyon · Hôtel-Dieu',
  invited: 120,
  accredited: 18,
  status: 'Brouillon'
}];

// ---------- Dashboard ----------
function MiniChart() {
  const pts = [38, 44, 41, 56, 62, 58, 71, 68, 80, 86];
  const w = 520,
    h = 130,
    max = 100;
  const step = w / (pts.length - 1);
  const line = pts.map((p, i) => `${i * step},${h - p / max * h}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    style: {
      width: '100%',
      height: 130
    },
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "g",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(21,152,211,0.18)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(21,152,211,0)"
  }))), /*#__PURE__*/React.createElement("polygon", {
    points: area,
    fill: "url(#g)"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: line,
    fill: "none",
    stroke: "var(--color-blue)",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), pts.map((p, i) => i === pts.length - 1 ? /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: i * step,
    cy: h - p / max * h,
    r: "4",
    fill: "var(--color-blue)",
    stroke: "#fff",
    strokeWidth: "2"
  }) : null));
}
function DonutStat() {
  const pct = 68,
    r = 46,
    c = 2 * Math.PI * r;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "120",
    height: "120",
    viewBox: "0 0 120 120"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: r,
    fill: "none",
    stroke: "var(--color-gray-100)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: r,
    fill: "none",
    stroke: "var(--color-blue)",
    strokeWidth: "12",
    strokeDasharray: `${pct / 100 * c} ${c}`,
    strokeLinecap: "round",
    transform: "rotate(-90 60 60)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "58",
    textAnchor: "middle",
    fontFamily: "var(--font-display)",
    fontSize: "26",
    fontWeight: "600",
    fill: "var(--color-navy)"
  }, pct, "%"), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "76",
    textAnchor: "middle",
    fontFamily: "var(--font-sans)",
    fontSize: "10",
    fill: "var(--text-muted)"
  }, "r\xE9ponse")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [['Acceptées', 132, 'var(--color-success)'], ['En attente', 73, 'var(--color-warning)'], ['Refusées', 42, 'var(--color-danger)']].map(([l, n, col]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: col
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)',
      minWidth: 78
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, n)))));
}
function Dashboard() {
  const {
    KpiCard,
    Card,
    Badge
  } = S_NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Journalistes invit\xE9s",
    value: "247",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 18
    }),
    delta: "+12%",
    caption: "ce mois"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Taux de r\xE9ponse",
    value: "68",
    unit: "%",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "trending-up",
      size: 18
    }),
    delta: "+4 pts",
    caption: "vs. N-1"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Accr\xE9ditations",
    value: "42",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "badge-check",
      size: 18
    }),
    caption: "valid\xE9es sur 68"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Retomb\xE9es m\xE9dia",
    value: "18",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "newspaper",
      size: 18
    }),
    delta: "+6",
    caption: "suivies"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: 0
    }
  }, "Engagement presse"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      margin: '2px 0 0'
    }
  }, "Ouvertures et r\xE9ponses \xB7 10 derni\xE8res semaines")), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "+18% ce trimestre")), /*#__PURE__*/React.createElement(MiniChart, null)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: '0 0 16px'
    }
  }, "R\xE9ponses aux invitations"), /*#__PURE__*/React.createElement(DonutStat, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: 0
    }
  }, "Relances \xE0 faire"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true
  }, "3 en attente")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, CONTACTS.filter(c => c.status === 'warning').concat(CONTACTS[4]).slice(0, 3).map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      background: 'var(--surface-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(S_NS.Avatar, {
    name: c.name,
    tone: "navy",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      lineHeight: 1.3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, c.media, " \xB7 dernier contact ", c.last)), /*#__PURE__*/React.createElement(S_NS.Button, {
    variant: "secondary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 14
    })
  }, "Relancer"))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: '0 0 14px'
    }
  }, "Activit\xE9 r\xE9cente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, [['badge-check', 'success', 'Léa Fontaine a été accréditée', 'Salon Tech & Médias · il y a 1 h'], ['mail-open', 'info', 'Le Monde a ouvert votre invitation', 'il y a 3 h'], ['file-text', 'navy', 'Communiqué « Lancement » publié', 'il y a 5 h'], ['x-circle', 'danger', 'Sophie Marchand a décliné', 'hier']].map(([ic, tone, txt, meta], i, arr) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '11px 0',
      borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: tone === 'success' ? 'var(--color-success-bg)' : tone === 'danger' ? 'var(--color-danger-bg)' : tone === 'info' ? 'var(--color-blue-50)' : 'var(--color-gray-100)',
      color: tone === 'success' ? 'var(--color-success)' : tone === 'danger' ? 'var(--color-danger)' : tone === 'info' ? 'var(--color-blue)' : 'var(--color-navy)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.35
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, txt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, meta))))))));
}

// ---------- Contacts ----------
function Contacts() {
  const {
    Card,
    Badge,
    Tabs,
    Avatar,
    Button
  } = S_NS;
  const [tab, setTab] = React.useState('all');
  const rows = tab === 'vip' ? CONTACTS.filter(c => c.vip) : CONTACTS;
  return /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: 'all',
      label: 'Tous les contacts',
      count: CONTACTS.length
    }, {
      value: 'vip',
      label: 'VIP / Médias clés',
      count: CONTACTS.filter(c => c.vip).length
    }, {
      value: 'pending',
      label: 'À relancer',
      count: CONTACTS.filter(c => c.status === 'warning').length
    }]
  })), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      textAlign: 'left',
      color: 'var(--text-muted)',
      fontSize: 11.5,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 20px',
      fontWeight: 600
    }
  }, "Journaliste"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 12px',
      fontWeight: 600
    }
  }, "M\xE9dia"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 12px',
      fontWeight: 600
    }
  }, "Rubrique"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 12px',
      fontWeight: 600
    }
  }, "Statut"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 12px',
      fontWeight: 600
    }
  }, "Dernier contact"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '14px 20px',
      fontWeight: 600
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map((c, i) => /*#__PURE__*/React.createElement("tr", {
    key: c.name,
    style: {
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    tone: c.vip ? 'blue' : 'navy',
    size: 36
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, c.name, " ", c.vip && /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 13,
    color: "var(--color-blue)"
  }))))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-body)'
    }
  }, c.media), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-muted)'
    }
  }, c.beat), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: c.status,
    dot: c.status !== 'info'
  }, c.label)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-muted)'
    }
  }, c.last), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: '1px solid var(--border-default)',
      background: '#fff',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "more-horizontal",
    size: 16,
    color: "var(--text-body)"
  }))))))));
}

// ---------- Events ----------
function Events() {
  const {
    Card,
    Badge,
    Button
  } = S_NS;
  const toneFor = s => s === 'Confirmé' ? 'success' : s === 'En cours' ? 'info' : 'neutral';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, EVENTS.map(e => {
    const pct = Math.round(e.accredited / e.invited * 100);
    return /*#__PURE__*/React.createElement(Card, {
      key: e.name,
      interactive: true
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-blue-50)',
        color: 'var(--color-blue)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 20
    })), /*#__PURE__*/React.createElement(Badge, {
      tone: toneFor(e.status)
    }, e.status)), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: 16.5,
        fontWeight: 600,
        margin: '0 0 6px',
        lineHeight: 1.3
      }
    }, e.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: 'var(--text-muted)',
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-days",
      size: 13
    }), " ", e.date), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 13
    }), " ", e.city), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--border-default)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12.5,
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-body)'
      }
    }, "Accr\xE9ditations"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, e.accredited, "/", e.invited)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 7,
        borderRadius: 99,
        background: 'var(--color-gray-100)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        background: 'var(--color-blue)',
        borderRadius: 99
      }
    }))));
  }));
}
Object.assign(window, {
  Dashboard,
  Contacts,
  Events
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens2.jsx
try { (() => {
/* PR Event 360 — App screens (part 2): Invitations, Communiqués, Accréditations, Reporting */

const S2 = window.PREvent360DesignSystem_82909b;

// ---------- shared ----------
function SectionHead({
  title,
  subtitle,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      margin: '2px 0 0'
    }
  }, subtitle)), right);
}

// ===================================================================
// INVITATIONS — funnel + recipient tracking
// ===================================================================
const INVITES = [{
  name: 'Camille Roy',
  media: 'Le Monde',
  sent: '12 sept.',
  state: 'accepted'
}, {
  name: 'Thomas Bernard',
  media: 'France Inter',
  sent: '12 sept.',
  state: 'opened'
}, {
  name: 'Léa Fontaine',
  media: 'Les Échos',
  sent: '12 sept.',
  state: 'accepted'
}, {
  name: 'Marc Dubois',
  media: 'AFP',
  sent: '12 sept.',
  state: 'sent'
}, {
  name: 'Sophie Marchand',
  media: 'Télérama',
  sent: '11 sept.',
  state: 'declined'
}, {
  name: 'Julien Petit',
  media: 'BFM TV',
  sent: '11 sept.',
  state: 'opened'
}, {
  name: 'Inès Garcia',
  media: 'Le Figaro',
  sent: '11 sept.',
  state: 'accepted'
}];
const INV_STATE = {
  sent: {
    tone: 'neutral',
    label: 'Envoyée',
    icon: 'send'
  },
  opened: {
    tone: 'info',
    label: 'Ouverte',
    icon: 'mail-open'
  },
  accepted: {
    tone: 'success',
    label: 'Acceptée',
    icon: 'check-circle'
  },
  declined: {
    tone: 'danger',
    label: 'Déclinée',
    icon: 'x-circle'
  }
};
function Funnel() {
  const steps = [['Envoyées', 247, '#07142F'], ['Ouvertes', 198, '#15315E'], ['Cliquées', 142, '#1598D3'], ['Acceptées', 132, '#2FBF71']];
  const max = steps[0][1];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, steps.map(([l, n, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 78,
      fontSize: 13,
      color: 'var(--text-body)'
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 30,
      background: 'var(--surface-subtle)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: n / max * 100 + '%',
      height: '100%',
      background: c,
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: 10,
      color: '#fff',
      fontSize: 12.5,
      fontWeight: 600
    }
  }, n)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      textAlign: 'right',
      fontSize: 12.5,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, Math.round(n / max * 100), "%"))));
}
function Invitations() {
  const {
    Card,
    Badge,
    Button,
    Avatar
  } = S2;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Tunnel d'invitation",
    subtitle: "Salon Tech & M\xE9dias 2026",
    right: /*#__PURE__*/React.createElement(Badge, {
      tone: "success"
    }, "53% d'acceptation")
  }), /*#__PURE__*/React.createElement(Funnel, null)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Campagne en cours",
    subtitle: "Programmez vos relances"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      background: 'var(--surface-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      background: 'var(--color-blue-50)',
      color: 'var(--color-blue)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Invitation officielle"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Envoy\xE9e \xE0 247 contacts"))), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "Active")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      background: 'var(--surface-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell-ring",
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Relance J+5"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Programm\xE9e pour 49 non-r\xE9pondants"))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Modifier")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }),
    fullWidth: true
  }, "Nouvelle relance")))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "Destinataires"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 14
    })
  }, "Exporter")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      textAlign: 'left',
      color: 'var(--text-muted)',
      fontSize: 11.5,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px 20px',
      fontWeight: 600
    }
  }, "Journaliste"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px',
      fontWeight: 600
    }
  }, "M\xE9dia"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px',
      fontWeight: 600
    }
  }, "Envoy\xE9e le"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px 20px',
      fontWeight: 600
    }
  }, "Statut"))), /*#__PURE__*/React.createElement("tbody", null, INVITES.map(r => {
    const st = INV_STATE[r.state];
    return /*#__PURE__*/React.createElement("tr", {
      key: r.name,
      style: {
        borderTop: '1px solid var(--border-default)'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: r.name,
      size: 32,
      tone: "navy"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, r.name))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 12px',
        color: 'var(--text-body)'
      }
    }, r.media), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 12px',
        color: 'var(--text-muted)'
      }
    }, r.sent), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 20px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: st.tone,
      dot: true
    }, st.label)));
  })))));
}

// ===================================================================
// COMMUNIQUÉS — list + preview
// ===================================================================
const RELEASES = [{
  title: 'Lancement de la plateforme PR Event 360',
  status: 'published',
  date: '28 sept. 2026',
  event: 'Conférence de presse',
  tone: 'success'
}, {
  title: 'Programme officiel — Salon Tech & Médias',
  status: 'review',
  date: '20 sept. 2026',
  event: 'Salon Tech & Médias',
  tone: 'warning'
}, {
  title: 'Partenariat média — Les Échos',
  status: 'draft',
  date: '15 sept. 2026',
  event: '—',
  tone: 'neutral'
}, {
  title: 'Bilan presse — édition 2025',
  status: 'published',
  date: '02 sept. 2026',
  event: 'Archives',
  tone: 'success'
}];
const REL_LABEL = {
  published: 'Publié',
  review: 'En relecture',
  draft: 'Brouillon'
};
function PressReleases() {
  const {
    Card,
    Badge,
    Button
  } = S2;
  const [sel, setSel] = React.useState(0);
  const r = RELEASES[sel];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.35fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "Communiqu\xE9s"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 14
    })
  }, "R\xE9diger")), RELEASES.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setSel(i),
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '14px 18px',
      border: 'none',
      borderBottom: '1px solid var(--border-default)',
      borderLeft: i === sel ? '3px solid var(--color-blue)' : '3px solid transparent',
      background: i === sel ? 'var(--surface-subtle)' : '#fff',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: 6,
      lineHeight: 1.35
    }
  }, it.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: it.tone
  }, REL_LABEL[it.status]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, it.date))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: r.tone
  }, REL_LABEL[r.status]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "pencil",
      size: 14
    })
  }, "\xC9diter"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 14
    })
  }, "Diffuser"))), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 26,
      fontWeight: 400,
      lineHeight: 1.2,
      margin: '0 0 8px'
    }
  }, r.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      fontSize: 12.5,
      color: 'var(--text-muted)',
      marginBottom: 18,
      paddingBottom: 18,
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 13
  }), " ", r.date), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar-check",
    size: 13
  }), " ", r.event), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 13
  }), " Paris")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-body)',
      lineHeight: 1.65
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "PARIS, le 28 septembre 2026"), " \u2014 PR Event 360 annonce le lancement de sa plateforme SaaS d\xE9di\xE9e \xE0 la gestion des relations presse \xE9v\xE9nementielles."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px'
    }
  }, "La solution centralise contacts m\xE9dias, invitations, relances, accr\xE9ditations et retomb\xE9es dans une interface unique pens\xE9e pour les \xE9quipes communication et les organisateurs d'\xE9v\xE9nements."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "\xAB Nous voulions offrir aux attach\xE9s de presse un outil clair pour piloter chaque \xE9tape, de l'invitation \xE0 la mesure des retomb\xE9es \xBB, explique la direction.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: '1px solid var(--border-default)',
      display: 'flex',
      gap: 10
    }
  }, ['communique-final.pdf', 'kit-presse.zip'].map(f => /*#__PURE__*/React.createElement("span", {
    key: f,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '7px 12px',
      background: 'var(--surface-subtle)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 12.5,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "paperclip",
    size: 13,
    color: "var(--color-blue)"
  }), " ", f)))));
}

// ===================================================================
// ACCRÉDITATIONS — validation queue
// ===================================================================
const ACCRED = [{
  name: 'Inès Garcia',
  media: 'Le Figaro',
  type: 'Presse écrite',
  state: 'pending'
}, {
  name: 'Marc Dubois',
  media: 'AFP',
  type: 'Photographe',
  state: 'pending'
}, {
  name: 'Nora Benali',
  media: 'Radio France',
  type: 'Radio',
  state: 'pending'
}, {
  name: 'Camille Roy',
  media: 'Le Monde',
  type: 'Presse écrite',
  state: 'approved'
}, {
  name: 'Léa Fontaine',
  media: 'Les Échos',
  type: 'Presse écrite',
  state: 'approved'
}, {
  name: 'Sophie Marchand',
  media: 'Télérama',
  type: 'Presse écrite',
  state: 'refused'
}];
function Accreditations() {
  const {
    Card,
    Badge,
    Button,
    Avatar,
    Tabs
  } = S2;
  const [tab, setTab] = React.useState('pending');
  const rows = ACCRED.filter(a => a.state === tab);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, [['En attente', 3, 'var(--color-warning)', 'clock'], ['Validées', 42, 'var(--color-success)', 'badge-check'], ['Refusées', 4, 'var(--color-danger)', 'x-circle']].map(([l, n, c, ic]) => /*#__PURE__*/React.createElement(Card, {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-md)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: c,
      color: '#fff',
      opacity: 0.92
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      fontWeight: 600,
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, l)))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: 'pending',
      label: 'En attente',
      count: ACCRED.filter(a => a.state === 'pending').length
    }, {
      value: 'approved',
      label: 'Validées',
      count: ACCRED.filter(a => a.state === 'approved').length
    }, {
      value: 'refused',
      label: 'Refusées',
      count: ACCRED.filter(a => a.state === 'refused').length
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8
    }
  }, rows.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: a.name,
    size: 40,
    tone: "navy"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, a.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, a.media, " \xB7 ", a.type)), a.state === 'pending' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })
  }, "Refuser"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    })
  }, "Accr\xE9diter")) : /*#__PURE__*/React.createElement(Badge, {
    tone: a.state === 'approved' ? 'success' : 'danger',
    dot: true
  }, a.state === 'approved' ? 'Accrédité' : 'Refusé'))))));
}

// ===================================================================
// REPORTING MÉDIA — coverage analytics
// ===================================================================
const COVERAGE = [{
  media: 'Le Monde',
  type: 'Presse écrite',
  reach: '2,4M',
  sentiment: 'positive',
  date: '29 sept.'
}, {
  media: 'France Inter',
  type: 'Radio',
  reach: '3,1M',
  sentiment: 'positive',
  date: '29 sept.'
}, {
  media: 'Les Échos',
  type: 'Presse écrite',
  reach: '880K',
  sentiment: 'neutral',
  date: '30 sept.'
}, {
  media: 'BFM TV',
  type: 'TV',
  reach: '1,6M',
  sentiment: 'positive',
  date: '30 sept.'
}, {
  media: 'Télérama',
  type: 'Web',
  reach: '420K',
  sentiment: 'neutral',
  date: '01 oct.'
}];
const SENT = {
  positive: {
    tone: 'success',
    label: 'Positif'
  },
  neutral: {
    tone: 'neutral',
    label: 'Neutre'
  },
  negative: {
    tone: 'danger',
    label: 'Négatif'
  }
};
function BarChart() {
  const data = [['Presse', 8, '#1598D3'], ['Web', 5, '#1598D3'], ['Radio', 3, '#1598D3'], ['TV', 2, '#1598D3']];
  const max = 8;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 24,
      height: 150,
      padding: '0 8px'
    }
  }, data.map(([l, n, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 56,
      height: n / max * 110,
      background: c,
      borderRadius: '6px 6px 0 0'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, l))));
}
function Reporting() {
  const {
    Card,
    Badge,
    KpiCard
  } = S2;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Retomb\xE9es m\xE9dia",
    value: "18",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "newspaper",
      size: 18
    }),
    delta: "+6",
    caption: "cet \xE9v\xE9nement"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Port\xE9e cumul\xE9e",
    value: "8,4",
    unit: "M",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "radio",
      size: 18
    }),
    delta: "+22%",
    caption: "impressions"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "\xC9quivalent m\xE9dia",
    value: "62",
    unit: "k\u20AC",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "euro",
      size: 18
    }),
    caption: "valeur estim\xE9e"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Sentiment positif",
    value: "78",
    unit: "%",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "smile",
      size: 18
    }),
    delta: "+5 pts",
    caption: "des retomb\xE9es"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Retomb\xE9es par type de m\xE9dia",
    subtitle: "18 retomb\xE9es suivies"
  }), /*#__PURE__*/React.createElement(BarChart, null)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "R\xE9partition du sentiment"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 6
    }
  }, [['Positif', 78, 'var(--color-success)'], ['Neutre', 17, 'var(--color-slate)'], ['Négatif', 5, 'var(--color-danger)']].map(([l, n, c]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, n, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 99,
      background: 'var(--color-gray-100)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: n + '%',
      height: '100%',
      background: c,
      borderRadius: 99
    }
  }))))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "Couverture m\xE9dia")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      textAlign: 'left',
      color: 'var(--text-muted)',
      fontSize: 11.5,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px 20px',
      fontWeight: 600
    }
  }, "M\xE9dia"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px',
      fontWeight: 600
    }
  }, "Type"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px',
      fontWeight: 600
    }
  }, "Port\xE9e"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px',
      fontWeight: 600
    }
  }, "Date"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '12px 20px',
      fontWeight: 600
    }
  }, "Sentiment"))), /*#__PURE__*/React.createElement("tbody", null, COVERAGE.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.media,
    style: {
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, c.media), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-body)'
    }
  }, c.type), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-body)',
      fontWeight: 600
    }
  }, c.reach), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      color: 'var(--text-muted)'
    }
  }, c.date), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: SENT[c.sentiment].tone
  }, SENT[c.sentiment].label))))))));
}
Object.assign(window, {
  Invitations,
  PressReleases,
  Accreditations,
  Reporting
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/shell.jsx
try { (() => {
/* PR Event 360 — App shell: icon helper, sidebar, topbar, shared data */

const NS = window.PREvent360DesignSystem_82909b;

// ---- Lucide icon helper ----
function Icon({
  name,
  size = 18,
  stroke = 1.75,
  color,
  style = {}
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          'stroke-width': stroke
        }
      });
    }
  }, [name, size, stroke]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      color: color || 'currentColor',
      ...style
    }
  });
}

// ---- Navigation model ----
const NAV = [{
  key: 'dashboard',
  label: 'Tableau de bord',
  icon: 'layout-dashboard'
}, {
  key: 'contacts',
  label: 'Contacts presse',
  icon: 'users'
}, {
  key: 'invitations',
  label: 'Invitations',
  icon: 'mail'
}, {
  key: 'events',
  label: 'Événements',
  icon: 'calendar'
}, {
  key: 'press',
  label: 'Communiqués',
  icon: 'file-text'
}, {
  key: 'accreditations',
  label: 'Accréditations',
  icon: 'badge-check'
}, {
  key: 'reporting',
  label: 'Reporting média',
  icon: 'bar-chart-3'
}];
function Sidebar({
  active,
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      flexShrink: 0,
      background: 'var(--color-navy)',
      color: 'rgba(255,255,255,0.72)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 22px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-pr-event-360-icon-reversed.png",
    alt: "",
    style: {
      width: 34,
      height: 34
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-brand)',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      fontSize: 14,
      color: '#fff',
      fontWeight: 400
    }
  }, "PR Event ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-blue)'
    }
  }, "360"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '8px 12px',
      flex: 1
    }
  }, NAV.map(item => {
    const on = item.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: item.key,
      onClick: () => onNavigate(item.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        background: on ? 'rgba(21,152,211,0.16)' : 'transparent',
        color: on ? '#fff' : 'rgba(255,255,255,0.7)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: on ? 600 : 500,
        borderLeft: on ? '2px solid var(--color-blue)' : '2px solid transparent',
        transition: 'background 160ms, color 160ms'
      },
      onMouseEnter: e => {
        if (!on) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = '#fff';
        }
      },
      onMouseLeave: e => {
        if (!on) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: item.icon,
      size: 18,
      color: on ? 'var(--color-blue)' : 'rgba(255,255,255,0.6)'
    }), item.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
      color: '#fff'
    }
  }, "CL"), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#fff'
    }
  }, "Claire Laurent"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'rgba(255,255,255,0.55)'
    }
  }, "Attach\xE9e de presse"))));
}
function Topbar({
  title,
  subtitle,
  onCreate
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 32px',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      margin: 0
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      margin: '3px 0 0'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px',
      height: 40,
      background: 'var(--surface-subtle)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      width: 240
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Rechercher un contact, un m\xE9dia\u2026",
    style: {
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 13.5,
      color: 'var(--text-primary)',
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18,
    color: "var(--text-body)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--color-warning)',
      border: '1.5px solid #fff'
    }
  })), /*#__PURE__*/React.createElement(NS.Button, {
    variant: "primary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }),
    onClick: onCreate
  }, "Cr\xE9er un \xE9v\xE9nement")));
}
Object.assign(window, {
  Icon,
  Sidebar,
  Topbar,
  NAV,
  PR_NS: NS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/site.jsx
try { (() => {
/* PR Event 360 — Marketing site sections */
const W_NS = window.PREvent360DesignSystem_82909b;
function WIcon({
  name,
  size = 18,
  stroke = 1.75,
  color
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          'stroke-width': stroke
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      color: color || 'currentColor'
    }
  });
}
const MAXW = 1140;
function Header() {
  const link = {
    fontSize: 14.5,
    fontWeight: 500,
    color: 'var(--text-body)',
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '0 32px',
      height: 70,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-pr-event-360.png",
    alt: "PR Event 360",
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: link
  }, "Fonctionnalit\xE9s"), /*#__PURE__*/React.createElement("span", {
    style: link
  }, "Solutions"), /*#__PURE__*/React.createElement("span", {
    style: link
  }, "Tarifs"), /*#__PURE__*/React.createElement("span", {
    style: link
  }, "Ressources")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...link,
      fontWeight: 500
    }
  }, "Connexion"), /*#__PURE__*/React.createElement(W_NS.Button, {
    variant: "premium",
    size: "sm"
  }, "Demander une d\xE9mo"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'linear-gradient(180deg, var(--surface-subtle) 0%, #fff 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '72px 32px 60px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "pr-overline",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: "radar",
    size: 15
  }), " Plateforme SaaS \xB7 Relations presse"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 54,
      fontWeight: 300,
      letterSpacing: '-0.02em',
      lineHeight: 1.08,
      margin: '18px 0 0'
    }
  }, "Pilotez vos relations presse \xE9v\xE9nementielles \xE0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-blue)',
      fontWeight: 500
    }
  }, "360\xB0")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18.5,
      color: 'var(--text-body)',
      lineHeight: 1.55,
      margin: '22px 0 0',
      maxWidth: 520
    }
  }, "Centralisez vos contacts m\xE9dias, invitations, relances, accr\xE9ditations et retomb\xE9es dans une plateforme pens\xE9e pour les \xE9v\xE9nements."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(W_NS.Button, {
    variant: "primary",
    size: "lg",
    trailingIcon: /*#__PURE__*/React.createElement(WIcon, {
      name: "arrow-right",
      size: 18
    })
  }, "Demander une d\xE9mo"), /*#__PURE__*/React.createElement(W_NS.Button, {
    variant: "secondary",
    size: "lg",
    leadingIcon: /*#__PURE__*/React.createElement(WIcon, {
      name: "play-circle",
      size: 18
    })
  }, "Voir les fonctionnalit\xE9s")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      marginTop: 28,
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: "check",
    size: 15,
    color: "var(--color-success)"
  }), " Sans engagement"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: "check",
    size: 15,
    color: "var(--color-success)"
  }), " Conforme RGPD"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: "check",
    size: 15,
    color: "var(--color-success)"
  }), " Support FR"))), /*#__PURE__*/React.createElement(HeroPreview, null)));
}
function HeroPreview() {
  const {
    KpiCard,
    Badge
  } = W_NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-lg)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: 'var(--color-blue-50)',
      color: 'var(--color-blue)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: "calendar",
    size: 16
  })), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "Salon Tech & M\xE9dias")), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "En cours")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Invit\xE9s",
    value: "247",
    icon: /*#__PURE__*/React.createElement(WIcon, {
      name: "users",
      size: 16
    })
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "R\xE9ponse",
    value: "68",
    unit: "%",
    icon: /*#__PURE__*/React.createElement(WIcon, {
      name: "trending-up",
      size: 16
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 16,
      background: 'var(--surface-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12.5,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, "Accr\xE9ditations valid\xE9es"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "42/68")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      borderRadius: 99,
      background: 'var(--color-gray-100)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '62%',
      height: '100%',
      background: 'var(--color-blue)',
      borderRadius: 99
    }
  }))));
}
function KpiBand() {
  const items = [['247', 'journalistes invités'], ['68%', 'de taux de réponse'], ['42', 'accréditations validées'], ['18', 'retombées média suivies']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      borderTop: '1px solid var(--border-default)',
      borderBottom: '1px solid var(--border-default)',
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '36px 32px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 24
    }
  }, items.map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      fontWeight: 600,
      color: 'var(--color-blue)',
      letterSpacing: '-0.02em'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, l)))));
}
function Features() {
  const feats = [['users', 'Gestion des contacts presse', 'Centralisez journalistes et médias avec tags, historique et engagement.'], ['mail', 'Invitations & accréditations', 'Envoyez, suivez et validez les demandes en quelques clics.'], ['bell-ring', 'Relances automatisées', 'Programmez des relances ciblées et ne manquez aucune réponse.'], ['user-check', 'Suivi des présences', 'Visualisez accréditations, confirmations et présences en temps réel.'], ['bar-chart-3', 'Reporting média', 'Mesurez les retombées et le ROI de chaque événement.'], ['users-2', 'Collaboration équipe', 'Travaillez à plusieurs sur un même événement, en toute clarté.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '80px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      maxWidth: 640,
      margin: '0 auto 48px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "pr-overline"
  }, "Une plateforme, tout le cycle RP"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 38,
      fontWeight: 400,
      margin: '14px 0 0'
    }
  }, "De l'invitation \xE0 la retomb\xE9e m\xE9dia"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: 'var(--text-body)',
      marginTop: 14,
      lineHeight: 1.55
    }
  }, "Coordonnez chaque \xE9tape de vos relations presse \xE9v\xE9nementielles depuis un seul outil, clair et structur\xE9.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20
    }
  }, feats.map(([ic, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 26,
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-blue-50)',
      color: 'var(--color-blue)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(WIcon, {
    name: ic,
    size: 21
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 17.5,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-body)',
      lineHeight: 1.55,
      margin: 0
    }
  }, d))))));
}
function CtaBand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-navy)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -80,
      top: -80,
      width: 360,
      height: 360,
      borderRadius: '50%',
      border: '1px solid rgba(21,152,211,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 10,
      top: 10,
      width: 240,
      height: 240,
      borderRadius: '50%',
      border: '1px solid rgba(21,152,211,0.18)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '72px 32px',
      position: 'relative',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 40,
      fontWeight: 300,
      color: '#fff',
      letterSpacing: '-0.02em',
      margin: 0
    }
  }, "Les RP \xE9v\xE9nementielles, ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-blue)',
      fontWeight: 500
    }
  }, "parfaitement orchestr\xE9es.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17.5,
      color: 'rgba(255,255,255,0.72)',
      maxWidth: 560,
      margin: '18px auto 0',
      lineHeight: 1.55
    }
  }, "Rejoignez les \xE9quipes communication qui centralisent et mesurent leurs relations presse avec PR Event 360."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(W_NS.Button, {
    variant: "primary",
    size: "lg",
    trailingIcon: /*#__PURE__*/React.createElement(WIcon, {
      name: "arrow-right",
      size: 18
    })
  }, "Demander une d\xE9mo"), /*#__PURE__*/React.createElement(W_NS.Button, {
    variant: "secondary",
    size: "lg",
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'rgba(255,255,255,0.3)'
    }
  }, "Nous contacter"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: '#fff',
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: MAXW,
      margin: '0 auto',
      padding: '36px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-pr-event-360.png",
    alt: "PR Event 360",
    style: {
      height: 26
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Connecter \xB7 Informer \xB7 Rayonner"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, "\xA9 2026 PR Event 360")));
}
Object.assign(window, {
  Header,
  Hero,
  KpiBand,
  Features,
  CtaBand,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/site.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.KpiCard = __ds_scope.KpiCard;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
