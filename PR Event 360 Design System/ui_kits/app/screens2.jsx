/* PR Event 360 — App screens (part 2): Invitations, Communiqués, Accréditations, Reporting */

const S2 = window.PREvent360DesignSystem_82909b;

// ---------- shared ----------
function SectionHead({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ===================================================================
// INVITATIONS — funnel + recipient tracking
// ===================================================================
const INVITES = [
  { name: 'Camille Roy', media: 'Le Monde', sent: '12 sept.', state: 'accepted' },
  { name: 'Thomas Bernard', media: 'France Inter', sent: '12 sept.', state: 'opened' },
  { name: 'Léa Fontaine', media: 'Les Échos', sent: '12 sept.', state: 'accepted' },
  { name: 'Marc Dubois', media: 'AFP', sent: '12 sept.', state: 'sent' },
  { name: 'Sophie Marchand', media: 'Télérama', sent: '11 sept.', state: 'declined' },
  { name: 'Julien Petit', media: 'BFM TV', sent: '11 sept.', state: 'opened' },
  { name: 'Inès Garcia', media: 'Le Figaro', sent: '11 sept.', state: 'accepted' },
];
const INV_STATE = {
  sent: { tone: 'neutral', label: 'Envoyée', icon: 'send' },
  opened: { tone: 'info', label: 'Ouverte', icon: 'mail-open' },
  accepted: { tone: 'success', label: 'Acceptée', icon: 'check-circle' },
  declined: { tone: 'danger', label: 'Déclinée', icon: 'x-circle' },
};

function Funnel() {
  const steps = [['Envoyées', 247, '#07142F'], ['Ouvertes', 198, '#15315E'], ['Cliquées', 142, '#1598D3'], ['Acceptées', 132, '#2FBF71']];
  const max = steps[0][1];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map(([l, n, c]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 78, fontSize: 13, color: 'var(--text-body)' }}>{l}</span>
          <div style={{ flex: 1, height: 30, background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ width: (n / max * 100) + '%', height: '100%', background: c, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{n}</div>
          </div>
          <span style={{ width: 44, textAlign: 'right', fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>{Math.round(n / max * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function Invitations() {
  const { Card, Badge, Button, Avatar } = S2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionHead title="Tunnel d'invitation" subtitle="Salon Tech & Médias 2026" right={<Badge tone="success">53% d'acceptation</Badge>} />
          <Funnel />
        </Card>
        <Card>
          <SectionHead title="Campagne en cours" subtitle="Programmez vos relances" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-blue-50)', color: 'var(--color-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={16} /></span>
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Invitation officielle</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Envoyée à 247 contacts</div></div>
              </div>
              <Badge tone="info">Active</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bell-ring" size={16} /></span>
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Relance J+5</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Programmée pour 49 non-répondants</div></div>
              </div>
              <Button variant="secondary" size="sm">Modifier</Button>
            </div>
            <Button variant="primary" leadingIcon={<Icon name="plus" size={16} />} fullWidth>Nouvelle relance</Button>
          </div>
        </Card>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14.5, color: 'var(--text-primary)' }}>Destinataires</strong>
          <Button variant="ghost" size="sm" leadingIcon={<Icon name="download" size={14} />}>Exporter</Button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Journaliste</th>
            <th style={{ padding: '12px', fontWeight: 600 }}>Média</th>
            <th style={{ padding: '12px', fontWeight: 600 }}>Envoyée le</th>
            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Statut</th>
          </tr></thead>
          <tbody>
            {INVITES.map((r) => { const st = INV_STATE[r.state]; return (
              <tr key={r.name} style={{ borderTop: '1px solid var(--border-default)' }}>
                <td style={{ padding: '11px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={r.name} size={32} tone="navy" /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span></div></td>
                <td style={{ padding: '11px 12px', color: 'var(--text-body)' }}>{r.media}</td>
                <td style={{ padding: '11px 12px', color: 'var(--text-muted)' }}>{r.sent}</td>
                <td style={{ padding: '11px 20px' }}><Badge tone={st.tone} dot>{st.label}</Badge></td>
              </tr>
            ); })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ===================================================================
// COMMUNIQUÉS — list + preview
// ===================================================================
const RELEASES = [
  { title: 'Lancement de la plateforme PR Event 360', status: 'published', date: '28 sept. 2026', event: 'Conférence de presse', tone: 'success' },
  { title: 'Programme officiel — Salon Tech & Médias', status: 'review', date: '20 sept. 2026', event: 'Salon Tech & Médias', tone: 'warning' },
  { title: 'Partenariat média — Les Échos', status: 'draft', date: '15 sept. 2026', event: '—', tone: 'neutral' },
  { title: 'Bilan presse — édition 2025', status: 'published', date: '02 sept. 2026', event: 'Archives', tone: 'success' },
];
const REL_LABEL = { published: 'Publié', review: 'En relecture', draft: 'Brouillon' };

function PressReleases() {
  const { Card, Badge, Button } = S2;
  const [sel, setSel] = React.useState(0);
  const r = RELEASES[sel];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16, alignItems: 'start' }}>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14.5, color: 'var(--text-primary)' }}>Communiqués</strong>
          <Button variant="primary" size="sm" leadingIcon={<Icon name="plus" size={14} />}>Rédiger</Button>
        </div>
        {RELEASES.map((it, i) => (
          <button key={i} onClick={() => setSel(i)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--border-default)', borderLeft: i === sel ? '3px solid var(--color-blue)' : '3px solid transparent', background: i === sel ? 'var(--surface-subtle)' : '#fff', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.35 }}>{it.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge tone={it.tone}>{REL_LABEL[it.status]}</Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.date}</span>
            </div>
          </button>
        ))}
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Badge tone={r.tone}>{REL_LABEL[r.status]}</Badge>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" leadingIcon={<Icon name="pencil" size={14} />}>Éditer</Button>
            <Button variant="primary" size="sm" leadingIcon={<Icon name="send" size={14} />}>Diffuser</Button>
          </div>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.2, margin: '0 0 8px' }}>{r.title}</h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--border-default)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={13} /> {r.date}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar-check" size={13} /> {r.event}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="map-pin" size={13} /> Paris</span>
        </div>
        <div style={{ fontSize: 14.5, color: 'var(--text-body)', lineHeight: 1.65 }}>
          <p style={{ margin: '0 0 14px' }}><strong style={{ color: 'var(--text-primary)' }}>PARIS, le 28 septembre 2026</strong> — PR Event 360 annonce le lancement de sa plateforme SaaS dédiée à la gestion des relations presse événementielles.</p>
          <p style={{ margin: '0 0 14px' }}>La solution centralise contacts médias, invitations, relances, accréditations et retombées dans une interface unique pensée pour les équipes communication et les organisateurs d'événements.</p>
          <p style={{ margin: 0 }}>« Nous voulions offrir aux attachés de presse un outil clair pour piloter chaque étape, de l'invitation à la mesure des retombées », explique la direction.</p>
        </div>
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-default)', display: 'flex', gap: 10 }}>
          {['communique-final.pdf', 'kit-presse.zip'].map((f) => (
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--text-body)' }}>
              <Icon name="paperclip" size={13} color="var(--color-blue)" /> {f}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===================================================================
// ACCRÉDITATIONS — validation queue
// ===================================================================
const ACCRED = [
  { name: 'Inès Garcia', media: 'Le Figaro', type: 'Presse écrite', state: 'pending' },
  { name: 'Marc Dubois', media: 'AFP', type: 'Photographe', state: 'pending' },
  { name: 'Nora Benali', media: 'Radio France', type: 'Radio', state: 'pending' },
  { name: 'Camille Roy', media: 'Le Monde', type: 'Presse écrite', state: 'approved' },
  { name: 'Léa Fontaine', media: 'Les Échos', type: 'Presse écrite', state: 'approved' },
  { name: 'Sophie Marchand', media: 'Télérama', type: 'Presse écrite', state: 'refused' },
];

function Accreditations() {
  const { Card, Badge, Button, Avatar, Tabs } = S2;
  const [tab, setTab] = React.useState('pending');
  const rows = ACCRED.filter(a => a.state === tab);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[['En attente', 3, 'var(--color-warning)', 'clock'], ['Validées', 42, 'var(--color-success)', 'badge-check'], ['Refusées', 4, 'var(--color-danger)', 'x-circle']].map(([l, n, c, ic]) => (
          <Card key={l}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: c, color: '#fff', opacity: 0.92 }}><Icon name={ic} size={22} /></span>
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{n}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{l}</div></div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <Tabs value={tab} onChange={setTab} items={[
            { value: 'pending', label: 'En attente', count: ACCRED.filter(a => a.state === 'pending').length },
            { value: 'approved', label: 'Validées', count: ACCRED.filter(a => a.state === 'approved').length },
            { value: 'refused', label: 'Refusées', count: ACCRED.filter(a => a.state === 'refused').length },
          ]} />
        </div>
        <div style={{ padding: 8 }}>
          {rows.map((a) => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
              <Avatar name={a.name} size={40} tone="navy" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{a.media} · {a.type}</div>
              </div>
              {a.state === 'pending' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" leadingIcon={<Icon name="x" size={14} />}>Refuser</Button>
                  <Button variant="primary" size="sm" leadingIcon={<Icon name="check" size={14} />}>Accréditer</Button>
                </div>
              ) : (
                <Badge tone={a.state === 'approved' ? 'success' : 'danger'} dot>{a.state === 'approved' ? 'Accrédité' : 'Refusé'}</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===================================================================
// REPORTING MÉDIA — coverage analytics
// ===================================================================
const COVERAGE = [
  { media: 'Le Monde', type: 'Presse écrite', reach: '2,4M', sentiment: 'positive', date: '29 sept.' },
  { media: 'France Inter', type: 'Radio', reach: '3,1M', sentiment: 'positive', date: '29 sept.' },
  { media: 'Les Échos', type: 'Presse écrite', reach: '880K', sentiment: 'neutral', date: '30 sept.' },
  { media: 'BFM TV', type: 'TV', reach: '1,6M', sentiment: 'positive', date: '30 sept.' },
  { media: 'Télérama', type: 'Web', reach: '420K', sentiment: 'neutral', date: '01 oct.' },
];
const SENT = { positive: { tone: 'success', label: 'Positif' }, neutral: { tone: 'neutral', label: 'Neutre' }, negative: { tone: 'danger', label: 'Négatif' } };

function BarChart() {
  const data = [['Presse', 8, '#1598D3'], ['Web', 5, '#1598D3'], ['Radio', 3, '#1598D3'], ['TV', 2, '#1598D3']];
  const max = 8;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 150, padding: '0 8px' }}>
      {data.map(([l, n, c]) => (
        <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n}</span>
          <div style={{ width: '100%', maxWidth: 56, height: (n / max * 110), background: c, borderRadius: '6px 6px 0 0' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function Reporting() {
  const { Card, Badge, KpiCard } = S2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <KpiCard label="Retombées média" value="18" icon={<Icon name="newspaper" size={18} />} delta="+6" caption="cet événement" />
        <KpiCard label="Portée cumulée" value="8,4" unit="M" icon={<Icon name="radio" size={18} />} delta="+22%" caption="impressions" />
        <KpiCard label="Équivalent média" value="62" unit="k€" icon={<Icon name="euro" size={18} />} caption="valeur estimée" />
        <KpiCard label="Sentiment positif" value="78" unit="%" icon={<Icon name="smile" size={18} />} delta="+5 pts" caption="des retombées" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionHead title="Retombées par type de média" subtitle="18 retombées suivies" />
          <BarChart />
        </Card>
        <Card>
          <SectionHead title="Répartition du sentiment" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
            {[['Positif', 78, 'var(--color-success)'], ['Neutre', 17, 'var(--color-slate)'], ['Négatif', 5, 'var(--color-danger)']].map(([l, n, c]) => (
              <div key={l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text-body)' }}>{l}</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n}%</span></div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--color-gray-100)', overflow: 'hidden' }}><div style={{ width: n + '%', height: '100%', background: c, borderRadius: 99 }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}><strong style={{ fontSize: 14.5, color: 'var(--text-primary)' }}>Couverture média</strong></div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Média</th>
            <th style={{ padding: '12px', fontWeight: 600 }}>Type</th>
            <th style={{ padding: '12px', fontWeight: 600 }}>Portée</th>
            <th style={{ padding: '12px', fontWeight: 600 }}>Date</th>
            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Sentiment</th>
          </tr></thead>
          <tbody>
            {COVERAGE.map((c) => (
              <tr key={c.media} style={{ borderTop: '1px solid var(--border-default)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.media}</td>
                <td style={{ padding: '12px', color: 'var(--text-body)' }}>{c.type}</td>
                <td style={{ padding: '12px', color: 'var(--text-body)', fontWeight: 600 }}>{c.reach}</td>
                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{c.date}</td>
                <td style={{ padding: '12px 20px' }}><Badge tone={SENT[c.sentiment].tone}>{SENT[c.sentiment].label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { Invitations, PressReleases, Accreditations, Reporting });
