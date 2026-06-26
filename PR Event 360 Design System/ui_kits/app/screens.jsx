/* PR Event 360 — App screens: Dashboard, Contacts, Events */

const S_NS = window.PREvent360DesignSystem_82909b;

// ---------- shared data ----------
const CONTACTS = [
  { name: 'Camille Roy', media: 'Le Monde', beat: 'Culture', status: 'success', label: 'Accrédité', vip: true, last: 'il y a 2 j' },
  { name: 'Thomas Bernard', media: 'France Inter', beat: 'Société', status: 'warning', label: 'À relancer', vip: false, last: 'il y a 6 j' },
  { name: 'Léa Fontaine', media: 'Les Échos', beat: 'Économie', status: 'success', label: 'Accrédité', vip: true, last: 'hier' },
  { name: 'Marc Dubois', media: 'AFP', beat: 'Général', status: 'info', label: 'Invité', vip: false, last: 'il y a 3 j' },
  { name: 'Sophie Marchand', media: 'Télérama', beat: 'Culture', status: 'danger', label: 'Refusé', vip: false, last: 'il y a 8 j' },
  { name: 'Julien Petit', media: 'BFM TV', beat: 'Actualité', status: 'warning', label: 'À relancer', vip: true, last: 'il y a 5 j' },
];

const EVENTS = [
  { name: 'Salon Tech & Médias 2026', date: '14 sept. 2026', city: 'Paris · Porte de Versailles', invited: 247, accredited: 42, status: 'En cours' },
  { name: 'Conférence de presse — Lancement', date: '28 sept. 2026', city: 'Paris · Station F', invited: 86, accredited: 61, status: 'Confirmé' },
  { name: 'Cocktail presse — Rentrée', date: '03 oct. 2026', city: 'Lyon · Hôtel-Dieu', invited: 120, accredited: 18, status: 'Brouillon' },
];

// ---------- Dashboard ----------
function MiniChart() {
  const pts = [38, 44, 41, 56, 62, 58, 71, 68, 80, 86];
  const w = 520, h = 130, max = 100;
  const step = w / (pts.length - 1);
  const line = pts.map((p, i) => `${i * step},${h - (p / max) * h}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 130 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(21,152,211,0.18)" />
          <stop offset="100%" stopColor="rgba(21,152,211,0)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#g)" />
      <polyline points={line} fill="none" stroke="var(--color-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => i === pts.length - 1 ? (
        <circle key={i} cx={i * step} cy={h - (p / max) * h} r="4" fill="var(--color-blue)" stroke="#fff" strokeWidth="2" />
      ) : null)}
    </svg>
  );
}

function DonutStat() {
  const pct = 68, r = 46, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-gray-100)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-blue)" strokeWidth="12"
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
        <text x="60" y="58" textAnchor="middle" fontFamily="var(--font-display)" fontSize="26" fontWeight="600" fill="var(--color-navy)">{pct}%</text>
        <text x="60" y="76" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="10" fill="var(--text-muted)">réponse</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[['Acceptées', 132, 'var(--color-success)'], ['En attente', 73, 'var(--color-warning)'], ['Refusées', 42, 'var(--color-danger)']].map(([l, n, col]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
            <span style={{ color: 'var(--text-body)', minWidth: 78 }}>{l}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const { KpiCard, Card, Badge } = S_NS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <KpiCard label="Journalistes invités" value="247" icon={<Icon name="users" size={18} />} delta="+12%" caption="ce mois" />
        <KpiCard label="Taux de réponse" value="68" unit="%" icon={<Icon name="trending-up" size={18} />} delta="+4 pts" caption="vs. N-1" />
        <KpiCard label="Accréditations" value="42" icon={<Icon name="badge-check" size={18} />} caption="validées sur 68" />
        <KpiCard label="Retombées média" value="18" icon={<Icon name="newspaper" size={18} />} delta="+6" caption="suivies" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Engagement presse</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>Ouvertures et réponses · 10 dernières semaines</p>
            </div>
            <Badge tone="info">+18% ce trimestre</Badge>
          </div>
          <MiniChart />
        </Card>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Réponses aux invitations</h3>
          <DonutStat />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Relances à faire</h3>
            <Badge tone="warning" dot>3 en attente</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTACTS.filter(c => c.status === 'warning').concat(CONTACTS[4]).slice(0, 3).map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <S_NS.Avatar name={c.name} tone="navy" size={36} />
                <div style={{ flex: 1, lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.media} · dernier contact {c.last}</div>
                </div>
                <S_NS.Button variant="secondary" size="sm" leadingIcon={<Icon name="send" size={14} />}>Relancer</S_NS.Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>Activité récente</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              ['badge-check', 'success', 'Léa Fontaine a été accréditée', 'Salon Tech & Médias · il y a 1 h'],
              ['mail-open', 'info', 'Le Monde a ouvert votre invitation', 'il y a 3 h'],
              ['file-text', 'navy', 'Communiqué « Lancement » publié', 'il y a 5 h'],
              ['x-circle', 'danger', 'Sophie Marchand a décliné', 'hier'],
            ].map(([ic, tone, txt, meta], i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: tone === 'success' ? 'var(--color-success-bg)' : tone === 'danger' ? 'var(--color-danger-bg)' : tone === 'info' ? 'var(--color-blue-50)' : 'var(--color-gray-100)',
                  color: tone === 'success' ? 'var(--color-success)' : tone === 'danger' ? 'var(--color-danger)' : tone === 'info' ? 'var(--color-blue)' : 'var(--color-navy)' }}>
                  <Icon name={ic} size={15} />
                </span>
                <div style={{ lineHeight: 1.35 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{txt}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------- Contacts ----------
function Contacts() {
  const { Card, Badge, Tabs, Avatar, Button } = S_NS;
  const [tab, setTab] = React.useState('all');
  const rows = tab === 'vip' ? CONTACTS.filter(c => c.vip) : CONTACTS;
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'all', label: 'Tous les contacts', count: CONTACTS.length },
          { value: 'vip', label: 'VIP / Médias clés', count: CONTACTS.filter(c => c.vip).length },
          { value: 'pending', label: 'À relancer', count: CONTACTS.filter(c => c.status === 'warning').length },
        ]} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <th style={{ padding: '14px 20px', fontWeight: 600 }}>Journaliste</th>
            <th style={{ padding: '14px 12px', fontWeight: 600 }}>Média</th>
            <th style={{ padding: '14px 12px', fontWeight: 600 }}>Rubrique</th>
            <th style={{ padding: '14px 12px', fontWeight: 600 }}>Statut</th>
            <th style={{ padding: '14px 12px', fontWeight: 600 }}>Dernier contact</th>
            <th style={{ padding: '14px 20px', fontWeight: 600 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.name} style={{ borderTop: '1px solid var(--border-default)' }}>
              <td style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={c.name} tone={c.vip ? 'blue' : 'navy'} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.name} {c.vip && <Icon name="star" size={13} color="var(--color-blue)" />}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px', color: 'var(--text-body)' }}>{c.media}</td>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{c.beat}</td>
              <td style={{ padding: '12px' }}><Badge tone={c.status} dot={c.status !== 'info'}>{c.label}</Badge></td>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{c.last}</td>
              <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="more-horizontal" size={16} color="var(--text-body)" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ---------- Events ----------
function Events() {
  const { Card, Badge, Button } = S_NS;
  const toneFor = (s) => s === 'Confirmé' ? 'success' : s === 'En cours' ? 'info' : 'neutral';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {EVENTS.map((e) => {
        const pct = Math.round((e.accredited / e.invited) * 100);
        return (
          <Card key={e.name} interactive>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--color-blue-50)', color: 'var(--color-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar" size={20} />
              </span>
              <Badge tone={toneFor(e.status)}>{e.status}</Badge>
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 600, margin: '0 0 6px', lineHeight: 1.3 }}>{e.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 3 }}>
              <Icon name="calendar-days" size={13} /> {e.date}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <Icon name="map-pin" size={13} /> {e.city}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                <span style={{ color: 'var(--text-body)' }}>Accréditations</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.accredited}/{e.invited}</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: 'var(--color-gray-100)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: 'var(--color-blue)', borderRadius: 99 }} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

Object.assign(window, { Dashboard, Contacts, Events });
