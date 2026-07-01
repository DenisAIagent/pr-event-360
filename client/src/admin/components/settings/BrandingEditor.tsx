import { useRef, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import type { EventBranding } from '../../lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEFAULT_ACCENT = '#5b4bdb';
const DEFAULT_BG = '#f7f4ef';
const DEFAULT_TEXT = '#1b1b2b';
const MAX_LOGO_BYTES = 250_000; // ~250 ko ; encodé en data URL dans la page publique
const MAX_BG_BYTES = 1_500_000; // ~1,5 Mo pour une image de fond

export function BrandingEditor({
  eventId,
  initial,
  eventName,
}: {
  eventId: string;
  initial: EventBranding;
  eventName: string;
}) {
  const apiAuthed = useAuthedApi();
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(initial.bgImageUrl);
  const [accent, setAccent] = useState(initial.accentColor ?? DEFAULT_ACCENT);
  const [bg, setBg] = useState(initial.bgColor ?? DEFAULT_BG);
  const [text, setText] = useState(initial.textColor ?? DEFAULT_TEXT);
  const [useAccent, setUseAccent] = useState(initial.accentColor != null);
  const [useBg, setUseBg] = useState(initial.bgColor != null);
  const [useText, setUseText] = useState(initial.textColor != null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function readFileToState(
    e: React.ChangeEvent<HTMLInputElement>,
    maxBytes: number,
    set: (v: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`Fichier trop lourd (${Math.round(file.size / 1024)} ko). Maximum ${Math.round(maxBytes / 1024)} ko.`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => set(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiAuthed.put(`/admin/events/${eventId}/branding`, {
        logoUrl: logoUrl || null,
        accentColor: useAccent ? accent : null,
        bgColor: useBg ? bg : null,
        textColor: useText ? text : null,
        bgImageUrl: bgImageUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  // Style appliqué à l'aperçu (mêmes variables que les pages publiques).
  const previewStyle: React.CSSProperties = {
    backgroundColor: useBg ? bg : 'var(--color-bg)',
    ...(bgImageUrl
      ? {
          backgroundImage: `url("${bgImageUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
    ['--p-accent' as string]: useAccent ? accent : 'var(--brand-accent)',
    ['--p-ink' as string]: useText ? text : 'var(--color-ink)',
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apparence de la page publique</CardTitle>
          <CardDescription>
            Personnalisez le formulaire d'accréditation et l'espace journaliste aux couleurs de l'événement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Apparence enregistrée.
            </div>
          )}

          <div className="grid gap-2">
            <Label>Logo</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                Choisir un fichier…
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                  Retirer
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => readFileToState(e, MAX_LOGO_BYTES, setLogoUrl)}
                style={{ display: 'none' }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              PNG, JPG ou SVG · 250 ko max. Ou collez une URL ci-dessous.
            </span>
            <Input
              type="url"
              placeholder="https://… (URL du logo, optionnel)"
              value={logoUrl && !logoUrl.startsWith('data:') ? logoUrl : ''}
              onChange={(e) => setLogoUrl(e.target.value || null)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Image de fond</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => bgFileRef.current?.click()}>
                Choisir un fichier…
              </Button>
              {bgImageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setBgImageUrl(null)}>
                  Retirer
                </Button>
              )}
              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                onChange={(e) => readFileToState(e, MAX_BG_BYTES, setBgImageUrl)}
                style={{ display: 'none' }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              1,5 Mo max. Conseil : choisissez une couleur de texte contrastée par-dessus.
            </span>
            <Input
              type="url"
              placeholder="https://… (URL de l'image, optionnel)"
              value={bgImageUrl && !bgImageUrl.startsWith('data:') ? bgImageUrl : ''}
              onChange={(e) => setBgImageUrl(e.target.value || null)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-accent"
                checked={useAccent}
                onCheckedChange={(v) => setUseAccent(v === true)}
              />
              <Label htmlFor="use-accent" className="font-normal">
                Couleur d'accent personnalisée
              </Label>
            </div>
            {useAccent && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-md border p-1"
                />
                <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="w-32" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="use-bg" checked={useBg} onCheckedChange={(v) => setUseBg(v === true)} />
              <Label htmlFor="use-bg" className="font-normal">
                Couleur de fond personnalisée
              </Label>
            </div>
            {useBg && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-md border p-1"
                />
                <Input value={bg} onChange={(e) => setBg(e.target.value)} className="w-32" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="use-text" checked={useText} onCheckedChange={(v) => setUseText(v === true)} />
              <Label htmlFor="use-text" className="font-normal">
                Couleur du texte personnalisée
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">Recommandé si vous choisissez un fond foncé.</span>
            {useText && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-md border p-1"
                />
                <Input value={text} onChange={(e) => setText(e.target.value)} className="w-32" />
              </div>
            )}
          </div>

          <div>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Enregistrement…' : "Enregistrer l'apparence"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu en direct */}
      <div>
        <span className="mb-2 block text-sm text-muted-foreground">Aperçu</span>
        <div className="brand-preview" style={previewStyle}>
          {logoUrl && <img src={logoUrl} alt="" className="brand-logo" style={{ marginBottom: 'var(--space-3)' }} />}
          <div className="bp-eyebrow">Accréditation presse</div>
          <div className="bp-title">{eventName}</div>
          <div className="bp-field" />
          <div className="bp-field" />
          <button type="button" className="bp-btn">
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
}
