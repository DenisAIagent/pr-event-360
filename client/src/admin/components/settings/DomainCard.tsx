import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';
import { InfoBubble } from '../InfoBubble';

interface DomainInfo {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainTarget: string;
}

/**
 * Domaine personnalisé (white-label) d'un événement. L'opérateur saisit le domaine,
 * le client crée un CNAME vers la cible affichée, puis « Vérifier » contrôle le DNS.
 * Le provisioning TLS se fait côté hébergeur (voir docs/custom-domains.md).
 */
export function DomainCard({ eventId }: { eventId: string }) {
  const api = useAuthedApi();
  const toast = useToast();
  const { data, reload } = useFetch<DomainInfo>(
    () => api.get<DomainInfo>(`/admin/events/${eventId}`),
    [eventId],
  );
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDomain(data.customDomain ?? '');
  }, [data]);

  async function save() {
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/domain`, { domain: domain.trim() || null });
      toast.success(domain.trim() ? 'Domaine enregistré.' : 'Domaine retiré.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      const r = await api.post<{ verified: boolean }>(`/admin/events/${eventId}/domain/verify`);
      if (r.verified) toast.success('Domaine vérifié ✓');
      else toast.error('DNS pas encore propagé ou incorrect. Réessayez plus tard.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }

  const target = data?.customDomainTarget ?? '';
  const saved = data?.customDomain ?? null;
  const changed = domain.trim() !== (saved ?? '');
  // « Nom » de l'enregistrement DNS : le sous-domaine (ex. presse) ou « @ » si domaine racine.
  const parts = (saved ?? '').split('.');
  const hostLabel = parts.length <= 2 ? '@' : parts[0];
  const rootDomain = parts.length <= 2 ? saved : parts.slice(1).join('.');

  return (
    <section className="card stack">
      <div>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Domaine personnalisé</h3>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '4px 0 0' }}>
          Servez les pages publiques de cet événement sous le domaine du client (ex.{' '}
          <code>presse.mon-festival.com</code>).
        </p>
      </div>

      <div className="field">
        <label htmlFor="custom-domain">Domaine</label>
        <input
          id="custom-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="presse.mon-festival.com"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      <div className="inline-actions">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !changed}>
          Enregistrer
        </button>
        {saved && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={verify} disabled={busy || changed}>
              Vérifier le DNS
            </button>
            <span className={`badge ${data?.customDomainVerified ? 'badge-success' : 'badge-warn'}`}>
              {data?.customDomainVerified ? 'Vérifié' : 'En attente de vérification'}
            </span>
          </>
        )}
      </div>

      {saved && target && (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            Connecter votre domaine
            <InfoBubble title="Comment connecter mon domaine ? (pas à pas)">
              <ol>
                <li>
                  Connectez-vous là où votre domaine est géré — votre <strong>registrar</strong> ou
                  hébergeur DNS (OVH, Gandi, GoDaddy, Cloudflare, Ionos, Namecheap…).
                </li>
                <li>
                  Ouvrez la <strong>zone DNS</strong> de <code>{rootDomain}</code>.
                </li>
                <li>
                  Ajoutez un enregistrement de type <strong>CNAME</strong> :
                  <ul>
                    <li>
                      <strong>Nom</strong> (ou « Hôte ») : <code>{hostLabel}</code>
                      {hostLabel === '@' && ' (le domaine racine)'}
                    </li>
                    <li>
                      <strong>Valeur</strong> (ou « Cible / Pointe vers ») : <code>{target}</code>
                    </li>
                    <li>
                      <strong>TTL</strong> : laissez la valeur par défaut
                    </li>
                  </ul>
                </li>
                <li>Enregistrez. La mise à jour DNS prend de quelques minutes à ~24 h.</li>
                <li>
                  Revenez ici et cliquez <strong>Vérifier le DNS</strong>.
                </li>
              </ol>
              <p style={{ marginTop: 8 }}>
                Le certificat <strong>HTTPS</strong> est créé automatiquement une fois le DNS en place —
                vous n'avez rien à gérer.
              </p>
              <p className="muted" style={{ marginTop: 6 }}>
                Vous ne gérez pas vos DNS vous-même ? Transmettez ces 3 valeurs (Type, Nom, Valeur) à la
                personne qui s'occupe de votre site / domaine.
              </p>
            </InfoBubble>
          </div>
          <div className="banner" style={{ fontSize: 'var(--text-sm)' }}>
            <div className="dns-record">
              <div className="dns-record-row">
                <span>Type</span>
                <code>CNAME</code>
              </div>
              <div className="dns-record-row">
                <span>Nom</span>
                <code style={{ userSelect: 'all' }}>{hostLabel}</code>
              </div>
              <div className="dns-record-row">
                <span>Valeur</span>
                <code style={{ userSelect: 'all' }}>{target}</code>
              </div>
            </div>
            <span className="muted" style={{ display: 'block', marginTop: 10 }}>
              Le HTTPS est délivré automatiquement ensuite. La propagation DNS peut prendre quelques
              minutes à quelques heures — cliquez « Vérifier le DNS » pour contrôler.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
