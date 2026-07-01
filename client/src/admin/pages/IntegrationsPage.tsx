import { useEffect, useState } from 'react';
import { useAuthedApi } from '../auth/AuthContext';
import { PageHero } from '../components/PageHero';
import { InfoBubble } from '../components/InfoBubble';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Configuration"
        title="Intégrations"
        subtitle="Clés des outils externes (envoi d'emails et SMS, stockage des photos/vidéos). Saisies ici, elles sont chiffrées et utilisées en priorité."
      />

      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        Les clés saisies ici priment sur la configuration du serveur.
        <InfoBubble title="« Priment sur la configuration du serveur »">
          Si une clé est définie ici, elle est utilisée à la place de celle du serveur (fichier de
          configuration). Vous pouvez la <strong>modifier ou l'effacer à tout moment</strong> : effacer une
          clé fait simplement revenir à la valeur définie côté serveur. Rien n'est cassé.
        </InfoBubble>
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {done && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {done}
        </div>
      )}

      {status && !status.encryptionReady && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La sauvegarde sécurisée des clés n’est pas encore activée sur le serveur. Demandez à votre
          administrateur technique de l’activer (variable <code>APP_ENCRYPTION_KEY</code>). En attendant,
          les clés restent configurées directement côté serveur.
        </div>
      )}

      {status && (
        <Card>
          <CardContent className="p-6">
            <form className="flex flex-col gap-4" onSubmit={submitAll}>
              {status.items.map((it) => (
                <div className="grid gap-2" key={it.key}>
                  <Label htmlFor={`setting-${it.key}`}>
                    {it.label}{' '}
                    <span className="font-normal text-sm text-muted-foreground">
                      — {SOURCE_LABEL[it.source]}
                    </span>
                  </Label>
                  <Input
                    id={`setting-${it.key}`}
                    type={it.secret ? 'password' : 'text'}
                    value={values[it.key] ?? ''}
                    placeholder={it.secret && it.preview ? `Actuel : ${it.preview}` : ''}
                    onChange={(e) => setVal(it.key, e.target.value)}
                    autoComplete="off"
                    disabled={!status.encryptionReady}
                  />
                  {it.secret && it.source === 'db' && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto self-start p-0 text-sm"
                      disabled={busy}
                      onClick={() => save({ [it.key]: '' }, `${it.label} effacé (retour au serveur).`)}
                    >
                      Effacer cette clé
                    </Button>
                  )}
                </div>
              ))}
              <Button type="submit" disabled={busy || !status.encryptionReady} className="self-start">
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
