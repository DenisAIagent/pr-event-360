import { useState } from 'react';
import { useParams } from 'react-router-dom';

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
    <div className="stack">
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Prévisualisez exactement ce que verront les journalistes. Le rendu mobile reproduit fidèlement
        l’affichage sur téléphone.
      </p>

      <div className="row-between">
        <div className="inline-actions" role="tablist" aria-label="Surface">
          {SURFACES.map((s) => (
            <button
              key={s.value}
              className="chip"
              aria-pressed={surface === s.value}
              onClick={() => setSurface(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="inline-actions">
          <div className="inline-actions" role="group" aria-label="Appareil">
            <button className="chip" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              🖥️ Desktop
            </button>
            <button className="chip" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              📱 Mobile
            </button>
          </div>
          {current.openable && (
            <a href={src} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              Ouvrir ↗
            </a>
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
