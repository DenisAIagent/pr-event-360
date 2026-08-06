import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Plug,
  XCircle,
} from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { PageHero } from '../components/PageHero';
import { InfoBubble } from '../components/InfoBubble';
import type {
  SecretStatus,
  SettingsGroupStatus,
  SettingsStatus,
  StorageCheckResult,
} from '../lib/types';

const SOURCE_LABEL: Record<SecretStatus['source'], string> = {
  db: 'défini ici',
  env: 'hérité du serveur',
  none: 'non défini',
};

const GROUP_ICON: Record<string, typeof Plug> = {
  notifications: Bell,
  stripe: CreditCard,
  cloudinary: ImageIcon,
  brevo: Mail,
  twilio: MessageSquare,
};

/**
 * Réglages d'intégration : clés API des outils externes, réservés au super-admin
 * plateforme. Une carte par service — chaque service s'enregistre indépendamment,
 * pour qu'une clé Brevo incomplète n'empêche pas d'activer Cloudinary.
 *
 * Les valeurs saisies ici sont chiffrées en base et priment sur l'environnement :
 * elles prennent effet immédiatement, sans redéploiement.
 */
export function IntegrationsPage() {
  const apiAuthed = useAuthedApi();
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Diagnostic Cloudinary (bouton « Tester la connexion »).
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<StorageCheckResult | null>(null);

  async function load() {
    setError(null);
    try {
      const s = await apiAuthed.get<SettingsStatus>('/admin/settings');
      setStatus(s);
      // Pré-remplit uniquement les valeurs NON secrètes (les secrets restent masqués).
      const init: Record<string, string> = {};
      for (const it of s.items) {
        if (!it.secret && it.source !== 'none' && it.preview) init[it.key] = it.preview;
      }
      setValues(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setVal(key: string, v: string) {
    setValues((cur) => ({ ...cur, [key]: v }));
  }

  async function save(groupId: string, updates: Record<string, string>, successMsg: string) {
    setBusyGroup(groupId);
    setError(null);
    setDone(null);
    try {
      const s = await apiAuthed.put<SettingsStatus>('/admin/settings', updates);
      setStatus(s);
      setDone(successMsg);
      // Les clés ont changé : le diagnostic affiché ne vaut plus rien.
      if (groupId === 'cloudinary') setTestResult(null);
      // On vide les champs secrets saisis (ils sont désormais stockés/masqués).
      setValues((cur) => {
        const next = { ...cur };
        for (const it of s.items) if (it.secret) delete next[it.key];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusyGroup(null);
    }
  }

  function submitGroup(e: React.FormEvent, group: SettingsGroupStatus) {
    e.preventDefault();
    if (!status) return;
    const updates: Record<string, string> = {};
    for (const it of status.items.filter((i) => i.group === group.id)) {
      const v = values[it.key] ?? '';
      // Secret laissé vide = inchangé (on ne l'écrase pas). Non secret = toujours envoyé.
      if (it.secret && v === '') continue;
      updates[it.key] = v;
    }
    save(group.id, updates, `${group.label} — réglages enregistrés.`);
  }

  async function runCloudinaryTest() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      setTestResult(await apiAuthed.post<StorageCheckResult>('/admin/settings/test/cloudinary', {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="stack">
      <PageHero
        eyebrow="Configuration"
        title="Intégrations"
        subtitle="Clés des outils externes : Stripe, Cloudinary, emails et SMS. Saisies ici, elles sont chiffrées et priment sur Railway sans redéploiement."
      />

      <p
        className="muted"
        style={{
          fontSize: 'var(--text-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 0,
        }}
      >
        Les clés saisies ici priment sur la configuration du serveur.
        <InfoBubble title="« Priment sur la configuration du serveur »">
          Si une clé est définie ici, elle est utilisée à la place de celle du serveur (variables
          d'environnement). Aucun redéploiement n'est nécessaire : le changement est actif dès
          l'enregistrement. Vous pouvez la <strong>modifier ou l'effacer à tout moment</strong> :
          effacer une clé fait simplement revenir à la valeur définie côté serveur. Rien n'est cassé.
        </InfoBubble>
      </p>

      {error && <div className="banner banner-error">{error}</div>}
      {done && <div className="banner banner-success">{done}</div>}

      {status && !status.encryptionReady && (
        <div className="banner banner-warn">
          La sauvegarde sécurisée des clés n'est pas encore activée sur le serveur. Demandez à votre
          administrateur technique de l'activer (variable <code>APP_ENCRYPTION_KEY</code>). En
          attendant, les clés restent configurées directement côté serveur.
        </div>
      )}

      {status?.groups.map((group) => {
        const items = status.items.filter((it) => it.group === group.id);
        const Icon = GROUP_ICON[group.id] ?? Plug;
        const isCloudinary = group.id === 'cloudinary';

        return (
          <form className="card stack" key={group.id} onSubmit={(e) => submitGroup(e, group)}>
            <header className="row-between" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <span className="icon-tile">
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{group.label}</h2>
                  <p
                    className="muted"
                    style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', maxWidth: '58ch' }}
                  >
                    {group.description}
                  </p>
                </div>
              </div>
              <span className={`badge ${group.configured ? 'badge-success' : 'badge-pending'}`}>
                {group.configured ? 'Configuré' : 'Incomplet'}
              </span>
            </header>

            {isCloudinary && !group.configured && (
              <div className="banner banner-info" style={{ marginBottom: 0 }}>
                Tant que ces quatre valeurs ne sont pas renseignées, l'envoi de fichiers renvoie une
                erreur : aucun visuel, aucune vidéo et aucun dossier de presse ne peut être déposé.
              </div>
            )}

            {group.id === 'stripe' && (
              <div className="banner banner-info" style={{ marginBottom: 0 }}>
                Renseignez au minimum <strong>Secret Key</strong> + <strong>Webhook secret</strong> et
                le Price ID de l'offre Événement (<code>price_…</code>). Les autres Price IDs sont
                optionnels tant que vous ne vendez pas ces offres. Les valeurs ici remplacent celles de
                Railway sans redéployer.
              </div>
            )}

            <div>
              {items.map((it) => (
                <div className="field" key={it.key}>
                  <label htmlFor={`setting-${it.key}`}>
                    {it.label}{' '}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 'var(--text-sm)' }}>
                      — {SOURCE_LABEL[it.source]}
                    </span>
                  </label>
                  <input
                    id={`setting-${it.key}`}
                    type={it.secret ? 'password' : 'text'}
                    value={values[it.key] ?? ''}
                    placeholder={it.secret && it.preview ? `Actuel : ${it.preview}` : ''}
                    onChange={(e) => setVal(it.key, e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={!status.encryptionReady}
                  />
                  {it.hint && <span className="hint">{it.hint}</span>}
                  {it.secret && it.source === 'db' && (
                    <button
                      type="button"
                      className="auth-link"
                      style={{ marginTop: 4, alignSelf: 'flex-start' }}
                      disabled={busyGroup !== null}
                      onClick={() =>
                        save(group.id, { [it.key]: '' }, `${it.label} effacé (retour au serveur).`)
                      }
                    >
                      Effacer cette clé
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="inline-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busyGroup !== null || !status.encryptionReady}
              >
                {busyGroup === group.id ? 'Enregistrement…' : 'Enregistrer'}
              </button>

              {isCloudinary && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={runCloudinaryTest}
                  disabled={testing || busyGroup !== null}
                >
                  {testing ? 'Test en cours…' : 'Tester la connexion'}
                </button>
              )}
            </div>

            {isCloudinary && testResult && <CheckList result={testResult} />}
          </form>
        );
      })}
    </div>
  );
}

/** Résultat du diagnostic : une ligne par contrainte, avec la raison exacte de l'échec. */
function CheckList({ result }: { result: StorageCheckResult }) {
  return (
    <section
      aria-live="polite"
      style={{
        borderTop: '1px solid var(--color-line)',
        paddingTop: 'var(--space-3)',
        marginTop: 'var(--space-2)',
      }}
    >
      <div
        className={`banner ${result.ok ? 'banner-success' : 'banner-error'}`}
        style={{ marginBottom: 'var(--space-3)' }}
      >
        {result.ok
          ? 'Cloudinary est opérationnel : les envois de fichiers fonctionneront.'
          : 'Cloudinary n’est pas encore opérationnel — détail ci-dessous.'}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
        {result.checks.map((check) => {
          const Icon =
            check.status === 'ok' ? CheckCircle2 : check.status === 'failed' ? XCircle : CircleDashed;
          const color =
            check.status === 'ok'
              ? 'var(--color-success)'
              : check.status === 'failed'
                ? 'var(--color-danger)'
                : 'var(--color-ink-faint)';
          return (
            <li key={check.id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'start' }}>
              <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} aria-hidden />
              <div>
                <strong style={{ fontSize: 'var(--text-sm)' }}>{check.label}</strong>
                <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                  {check.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
