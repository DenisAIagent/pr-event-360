import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button } from '@/components/ui/button';

type Surface = 'accreditation' | 'space' | 'newsroom';
type Device = 'desktop' | 'mobile';

const SURFACES: { value: Surface; label: string; path: (id: string) => string; openable: boolean }[] = [
  { value: 'accreditation', label: 'Formulaire d’accréditation', path: (id) => `/accreditation/${id}`, openable: true },
  { value: 'space', label: 'Espace journaliste', path: (id) => `/espace-preview/${id}`, openable: false },
  { value: 'newsroom', label: 'Newsroom', path: (id) => `/newsroom/${id}`, openable: true },
];

const MOBILE_WIDTH = 390;

export function PreviewTab() {
  const { eventId = '' } = useParams();
  const [surface, setSurface] = useState<Surface>('accreditation');
  const [device, setDevice] = useState<Device>('desktop');

  const current = SURFACES.find((s) => s.value === surface)!;
  const src = current.path(eventId);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Prévisualisez exactement ce que verront les journalistes. Le rendu mobile reproduit fidèlement
        l’affichage sur téléphone.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Surface">
          {SURFACES.map((s) => (
            <Button
              key={s.value}
              type="button"
              size="sm"
              variant={surface === s.value ? 'default' : 'outline'}
              aria-pressed={surface === s.value}
              onClick={() => setSurface(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2" role="group" aria-label="Appareil">
            <Button
              type="button"
              size="sm"
              variant={device === 'desktop' ? 'default' : 'outline'}
              aria-pressed={device === 'desktop'}
              onClick={() => setDevice('desktop')}
            >
              <Icon name="monitor" /> Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={device === 'mobile' ? 'default' : 'outline'}
              aria-pressed={device === 'mobile'}
              onClick={() => setDevice('mobile')}
            >
              <Icon name="smartphone" /> Mobile
            </Button>
          </div>
          {current.openable && (
            <Button asChild variant="ghost" size="sm">
              <a href={src} target="_blank" rel="noreferrer">
                Ouvrir ↗
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="preview-stage">
        <div
          className={`preview-frame${device === 'mobile' ? ' is-mobile' : ''}`}
          style={device === 'mobile' ? { width: MOBILE_WIDTH } : undefined}
        >
          <iframe
            key={`${surface}-${device}`}
            title="Aperçu journaliste"
            src={src}
            className="preview-iframe"
          />
        </div>
      </div>
    </div>
  );
}
