import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

const VIDEO_SRC = '/media/pr-event-360-demo.mp4';
const POSTER_JPG = '/media/pr-event-360-demo-poster.jpg';
const POSTER_WEBP = '/media/pr-event-360-demo-poster.webp';
const CAPTIONS_SRC = '/media/pr-event-360-demo.fr.vtt';

/**
 * Vidéo de présentation en lecture à la demande.
 *
 * La façade (affiche + bouton) est rendue tant que l'utilisateur n'a pas cliqué :
 * le MP4 de 5 Mo n'est donc jamais téléchargé au chargement de la page, ce qui
 * préserve le budget de la landing. Le <video> ne remplace la façade qu'au clic,
 * et démarre alors la lecture.
 */
export function VideoShowcase() {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!started) return;
    // Lecture déclenchée par un geste utilisateur : autorisée par les navigateurs.
    // Un échec (politique restrictive) laisse simplement les contrôles natifs.
    void videoRef.current?.play().catch(() => undefined);
  }, [started]);

  if (started) {
    return (
      <div className="lp-video">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- piste de sous-titres fournie ci-dessous */}
        <video
          ref={videoRef}
          className="lp-video-el"
          controls
          playsInline
          preload="auto"
          poster={POSTER_JPG}
          width={1920}
          height={1080}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
          <track kind="captions" src={CAPTIONS_SRC} srcLang="fr" label="Français" default />
          Votre navigateur ne peut pas lire cette vidéo.{' '}
          <a href={VIDEO_SRC}>Télécharger la vidéo (MP4)</a>.
        </video>
      </div>
    );
  }

  return (
    <div className="lp-video">
      <button
        type="button"
        className="lp-video-facade"
        onClick={() => setStarted(true)}
        aria-label="Lire la vidéo de présentation de PR Event 360, 58 secondes, sous-titrée"
      >
        <picture>
          <source srcSet={POSTER_WEBP} type="image/webp" />
          <img
            src={POSTER_JPG}
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="lp-video-poster"
          />
        </picture>
        <span className="lp-video-scrim" aria-hidden="true" />
        <span className="lp-video-play" aria-hidden="true">
          <Play size={30} fill="currentColor" strokeWidth={0} />
        </span>
        <span className="lp-video-meta" aria-hidden="true">
          58 s · sous-titrée
        </span>
      </button>
    </div>
  );
}
