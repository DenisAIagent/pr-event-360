/* PR Event 360 — Marketing site sections */
const W_NS = window.PREvent360DesignSystem_82909b;

function WIcon({ name, size = 18, stroke = 1.75, color }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i'); el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': stroke } });
    }
  });
  return <span ref={ref} style={{ display: 'inline-flex', color: color || 'currentColor' }} />;
}

const MAXW = 1140;

function Header() {
  const link = { fontSize: 14.5, fontWeight: 500, color: 'var(--text-body)', cursor: 'pointer' };
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '0 32px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="../../assets/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 30 }} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <span style={link}>Fonctionnalités</span>
          <span style={link}>Solutions</span>
          <span style={link}>Tarifs</span>
          <span style={link}>Ressources</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...link, fontWeight: 500 }}>Connexion</span>
          <W_NS.Button variant="premium" size="sm">Demander une démo</W_NS.Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ background: 'linear-gradient(180deg, var(--surface-subtle) 0%, #fff 100%)' }}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '72px 32px 60px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
        <div>
          <span className="pr-overline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <WIcon name="radar" size={15} /> Plateforme SaaS · Relations presse
          </span>
          <h1 style={{ fontSize: 54, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.08, margin: '18px 0 0' }}>
            Pilotez vos relations presse événementielles à <span style={{ color: 'var(--color-blue)', fontWeight: 500 }}>360°</span>
          </h1>
          <p style={{ fontSize: 18.5, color: 'var(--text-body)', lineHeight: 1.55, margin: '22px 0 0', maxWidth: 520 }}>
            Centralisez vos contacts médias, invitations, relances, accréditations et retombées dans une plateforme pensée pour les événements.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <W_NS.Button variant="primary" size="lg" trailingIcon={<WIcon name="arrow-right" size={18} />}>Demander une démo</W_NS.Button>
            <W_NS.Button variant="secondary" size="lg" leadingIcon={<WIcon name="play-circle" size={18} />}>Voir les fonctionnalités</W_NS.Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 28, fontSize: 13, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WIcon name="check" size={15} color="var(--color-success)" /> Sans engagement</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WIcon name="check" size={15} color="var(--color-success)" /> Conforme RGPD</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WIcon name="check" size={15} color="var(--color-success)" /> Support FR</span>
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const { KpiCard, Badge } = W_NS;
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-blue-50)', color: 'var(--color-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><WIcon name="calendar" size={16} /></span>
          <strong style={{ fontSize: 14.5, color: 'var(--text-primary)' }}>Salon Tech & Médias</strong>
        </div>
        <Badge tone="info">En cours</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <KpiCard label="Invités" value="247" icon={<WIcon name="users" size={16} />} />
        <KpiCard label="Réponse" value="68" unit="%" icon={<WIcon name="trending-up" size={16} />} />
      </div>
      <div style={{ marginTop: 12, padding: 16, background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-body)' }}>Accréditations validées</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>42/68</span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: 'var(--color-gray-100)' }}><div style={{ width: '62%', height: '100%', background: 'var(--color-blue)', borderRadius: 99 }} /></div>
      </div>
    </div>
  );
}

function KpiBand() {
  const items = [['247', 'journalistes invités'], ['68%', 'de taux de réponse'], ['42', 'accréditations validées'], ['18', 'retombées média suivies']];
  return (
    <section style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', background: '#fff' }}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '36px 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
        {items.map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--color-blue)', letterSpacing: '-0.02em' }}>{n}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    ['users', 'Gestion des contacts presse', 'Centralisez journalistes et médias avec tags, historique et engagement.'],
    ['mail', 'Invitations & accréditations', 'Envoyez, suivez et validez les demandes en quelques clics.'],
    ['bell-ring', 'Relances automatisées', 'Programmez des relances ciblées et ne manquez aucune réponse.'],
    ['user-check', 'Suivi des présences', 'Visualisez accréditations, confirmations et présences en temps réel.'],
    ['bar-chart-3', 'Reporting média', 'Mesurez les retombées et le ROI de chaque événement.'],
    ['users-2', 'Collaboration équipe', 'Travaillez à plusieurs sur un même événement, en toute clarté.'],
  ];
  return (
    <section style={{ background: 'var(--surface-subtle)' }}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <span className="pr-overline">Une plateforme, tout le cycle RP</span>
          <h2 style={{ fontSize: 38, fontWeight: 400, margin: '14px 0 0' }}>De l'invitation à la retombée média</h2>
          <p style={{ fontSize: 17, color: 'var(--text-body)', marginTop: 14, lineHeight: 1.55 }}>
            Coordonnez chaque étape de vos relations presse événementielles depuis un seul outil, clair et structuré.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {feats.map(([ic, t, d]) => (
            <div key={t} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 26, boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-blue-50)', color: 'var(--color-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <WIcon name={ic} size={21} />
              </span>
              <h3 style={{ fontSize: 17.5, fontWeight: 600, margin: '0 0 8px' }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: 'var(--text-body)', lineHeight: 1.55, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section style={{ background: 'var(--color-navy)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(21,152,211,0.25)' }} />
      <div style={{ position: 'absolute', right: 10, top: 10, width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(21,152,211,0.18)' }} />
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '72px 32px', position: 'relative', textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, fontWeight: 300, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
          Les RP événementielles, <span style={{ color: 'var(--color-blue)', fontWeight: 500 }}>parfaitement orchestrées.</span>
        </h2>
        <p style={{ fontSize: 17.5, color: 'rgba(255,255,255,0.72)', maxWidth: 560, margin: '18px auto 0', lineHeight: 1.55 }}>
          Rejoignez les équipes communication qui centralisent et mesurent leurs relations presse avec PR Event 360.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30 }}>
          <W_NS.Button variant="primary" size="lg" trailingIcon={<WIcon name="arrow-right" size={18} />}>Demander une démo</W_NS.Button>
          <W_NS.Button variant="secondary" size="lg" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>Nous contacter</W_NS.Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: '#fff', borderTop: '1px solid var(--border-default)' }}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '36px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="../../assets/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 26 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Connecter · Informer · Rayonner</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>© 2026 PR Event 360</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Header, Hero, KpiBand, Features, CtaBand, Footer });
