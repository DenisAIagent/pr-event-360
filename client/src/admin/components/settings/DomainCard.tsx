import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';
import { InfoBubble } from '../InfoBubble';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Domaine personnalisé</CardTitle>
        <CardDescription>
          Servez les pages publiques de cet événement sous le domaine du client (ex.{' '}
          <code>presse.mon-festival.com</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="custom-domain">Domaine</Label>
          <Input
            id="custom-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="presse.mon-festival.com"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={busy || !changed}>
            Enregistrer
          </Button>
          {saved && (
            <>
              <Button variant="ghost" size="sm" onClick={verify} disabled={busy || changed}>
                Vérifier le DNS
              </Button>
              <Badge
                className={
                  data?.customDomainVerified
                    ? 'border-transparent bg-emerald-100 text-emerald-800'
                    : 'border-transparent bg-amber-100 text-amber-800'
                }
              >
                {data?.customDomainVerified ? 'Vérifié' : 'En attente de vérification'}
              </Badge>
            </>
          )}
        </div>

        {saved && target && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
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
              <p className="mt-1.5 text-muted-foreground">
                Vous ne gérez pas vos DNS vous-même ? Transmettez ces 3 valeurs (Type, Nom, Valeur) à la
                personne qui s'occupe de votre site / domaine.
              </p>
            </InfoBubble>
          </div>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">
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
            <span className="mt-2.5 block text-muted-foreground">
              Le HTTPS est délivré automatiquement ensuite. La propagation DNS peut prendre quelques
              minutes à quelques heures — cliquez « Vérifier le DNS » pour contrôler.
            </span>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}
