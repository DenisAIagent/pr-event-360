/* PR Event 360 — App shell: icon helper, sidebar, topbar, shared data */

const NS = window.PREvent360DesignSystem_82909b;

// ---- Lucide icon helper ----
function Icon({ name, size = 18, stroke = 1.75, color, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': stroke } });
    }
  }, [name, size, stroke]);
  return <span ref={ref} style={{ display: 'inline-flex', color: color || 'currentColor', ...style }} />;
}

// ---- Navigation model ----
const NAV = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'layout-dashboard' },
  { key: 'contacts', label: 'Contacts presse', icon: 'users' },
  { key: 'invitations', label: 'Invitations', icon: 'mail' },
  { key: 'events', label: 'Événements', icon: 'calendar' },
  { key: 'press', label: 'Communiqués', icon: 'file-text' },
  { key: 'accreditations', label: 'Accréditations', icon: 'badge-check' },
  { key: 'reporting', label: 'Reporting média', icon: 'bar-chart-3' },
];

function Sidebar({ active, onNavigate }) {
  return (
    <aside style={{
      width: 248, flexShrink: 0, background: 'var(--color-navy)', color: 'rgba(255,255,255,0.72)',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <img src="../../assets/logo-pr-event-360-icon-reversed.png" alt="" style={{ width: 34, height: 34 }} />
        <span style={{ fontFamily: 'var(--font-brand)', letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 14, color: '#fff', fontWeight: 400 }}>
          PR Event <span style={{ color: 'var(--color-blue)' }}>360</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', flex: 1 }}>
        {NAV.map((item) => {
          const on = item.key === active;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
              borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: on ? 'rgba(21,152,211,0.16)' : 'transparent',
              color: on ? '#fff' : 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: on ? 600 : 500,
              borderLeft: on ? '2px solid var(--color-blue)' : '2px solid transparent',
              transition: 'background 160ms, color 160ms',
            }}
            onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
            >
              <Icon name={item.icon} size={18} color={on ? 'var(--color-blue)' : 'rgba(255,255,255,0.6)'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff' }}>CL</span>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Claire Laurent</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>Attachée de presse</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, subtitle, onCreate }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 32px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-card)',
    }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 240 }}>
          <Icon name="search" size={16} color="var(--text-muted)" />
          <input placeholder="Rechercher un contact, un média…" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-primary)', width: '100%' }} />
        </div>
        <button style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-card)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Icon name="bell" size={18} color="var(--text-body)" />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-warning)', border: '1.5px solid #fff' }} />
        </button>
        <NS.Button variant="primary" leadingIcon={<Icon name="plus" size={16} />} onClick={onCreate}>Créer un événement</NS.Button>
      </div>
    </header>
  );
}

Object.assign(window, { Icon, Sidebar, Topbar, NAV, PR_NS: NS });
