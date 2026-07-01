import { useEffect, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SiteInfo {
  subdomainSlug: string | null;
  platformBaseDomain: string | null;
}

/**
 * Sous-domaine self-service sur la plateforme (ex. rockinrio.<base>). Le client choisit
 * un identifiant ; aucun DNS/TLS de son côté (certificat wildcard). Si le domaine de base
 * n'est pas encore configuré (PLATFORM_BASE_DOMAIN), l'identifiant est mémorisé et s'activera après.
 */
export function SubdomainCard({ eventId }: { eventId: string }) {
  const api = useAuthedApi();
  const toast = useToast();
  const { data, reload } = useFetch<SiteInfo>(
    () => api.get<SiteInfo>(`/admin/events/${eventId}`),
    [eventId],
  );
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setSlug(data.subdomainSlug ?? '');
  }, [data]);

  const base = data?.platformBaseDomain ?? null;
  const saved = data?.subdomainSlug ?? null;
  const clean = slug.trim().toLowerCase();
  const changed = clean !== (saved ?? '');

  async function save() {
    setBusy(true);
    try {
      await api.put(`/admin/events/${eventId}/subdomain`, { slug: clean || null });
      toast.success(clean ? 'Sous-domaine enregistré.' : 'Sous-domaine retiré.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sous-domaine</CardTitle>
        <CardDescription>
          Une adresse prête à l’emploi sur la plateforme — aucune configuration DNS de votre côté.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="subdomain-slug">Identifiant</Label>
          <div className="flex items-center gap-2">
            <Input
              id="subdomain-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="rock-in-rio"
              autoCapitalize="none"
              spellCheck={false}
              className="flex-1"
            />
            {base && <span className="whitespace-nowrap text-sm text-muted-foreground">.{base}</span>}
          </div>
        </div>

        {clean && base && (
          <p className="text-sm text-muted-foreground">
            Adresse&nbsp;: <code style={{ userSelect: 'all' }}>https://{clean}.{base}</code>
          </p>
        )}
        {!base && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong>Bientôt disponible.</strong> Les adresses par sous-domaine ne sont pas encore activées sur
            cette plateforme. Vous pouvez réserver votre identifiant dès maintenant&nbsp;: il sera appliqué
            automatiquement à l’activation. En attendant, votre newsroom reste accessible via son lien standard.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={busy || !changed}>
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
