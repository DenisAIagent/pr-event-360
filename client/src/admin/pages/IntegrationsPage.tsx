import { useEffect, useState } from 'react';
import { useAuthedApi } from '../auth/AuthContext';
import { PageHero } from '../components/PageHero';
import type { SettingsStatus } from '../lib/types';

const SOURCE_LABEL: Record<string, string> = {
  db: 'défini ici',
  env: 'hérité du serveur (.env)',
  none: 'non défini',
};

/** Réglages d'intégration : clés API des outils externes (Brevo, Twilio). Admin only. */
export function IntegrationsPage() {
  const apiAuthed = useAuthedApi();
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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

  async function save(updates: Record<string, string>, successMsg: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const s = await apiAuthed.put<SettingsStatus>('/admin/settings', updates);
      setStatus(s);
      setDone(successMsg);
      // On vide les champs secrets saisis (ils sont désormais stockés/masqués).
      setValues((cur) => {
        const next = { ...cur };
        for (const it of s.items) if (it.secret) delete next[it.key];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  function submitAll(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    const updates: Record<string, string> = {};
    for (const it of status.items) {
      const v = values[it.key] ?? '';
      // Secret laissé vide = inchangé (on ne l'écrase pas). Non secret = toujours envoyé.
      if (it.secret && v === '') continue;
      updates[it.key] = v;
    }
    save(updates, 'Réglages enregistrés.');
  }

  return (
    <div className="stack">
        <PageHero
          eyebrow="Configuration"
          title="Intégrations"
          subtitle="Clés API des outils externes. Les valeurs sont chiffrées avant stockage et remplacent la configuration du serveur."
        />

        {error && <div className="banner banner-error">{error}</div>}
        {done && <div className="banner banner-success">{done}</div>}

        {status && !status.encryptionReady && (
          <div className="banner banner-warn">
            Le chiffrement n’est pas configuré (APP_ENCRYPTION_KEY manquant). Les clés API ne peuvent
            pas être enregistrées ici tant que la clé maîtresse n’est pas définie côté serveur.
          </div>
        )}

        {status && (
          <form className="card stack" onSubmit={submitAll}>
            {status.items.map((it) => (
              <div className="field" key={it.key}>
                <label>
                  {it.label}{' '}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 'var(--text-sm)' }}>
                    — {SOURCE_LABEL[it.source]}
                  </span>
                </label>
                <input
                  type={it.secret ? 'password' : 'text'}
                  value={values[it.key] ?? ''}
                  placeholder={it.secret && it.preview ? `Actuel : ${it.preview}` : ''}
                  onChange={(e) => setVal(it.key, e.target.value)}
                  autoComplete="off"
                  disabled={!status.encryptionReady}
                />
                {it.secret && it.source === 'db' && (
                  <button
                    type="button"
                    className="auth-link"
                    style={{ marginTop: 4 }}
                    disabled={busy}
                    onClick={() => save({ [it.key]: '' }, `${it.label} effacé (retour au serveur).`)}
                  >
                    Effacer cette clé
                  </button>
                )}
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={busy || !status.encryptionReady}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
    </div>
  );
}
