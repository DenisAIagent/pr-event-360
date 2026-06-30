import type { CSSProperties } from 'react';
import type { EventBranding } from './types';

/**
 * Traduit le branding d'un événement en surcharges de variables CSS appliquées
 * sur un conteneur. On dérive les nuances accent (fort / teinte) depuis la
 * couleur choisie via color-mix, et on pose la couleur de fond de page.
 */
export function brandingStyle(branding: EventBranding | undefined): CSSProperties {
  const style: Record<string, string> = {};
  if (branding?.accentColor) {
    style['--color-accent'] = branding.accentColor;
    style['--color-accent-strong'] = `color-mix(in oklab, ${branding.accentColor} 78%, black)`;
    style['--color-accent-tint'] = `color-mix(in oklab, ${branding.accentColor} 14%, white)`;
  }
  if (branding?.bgColor) {
    style.backgroundColor = branding.bgColor;
    style['--color-bg'] = branding.bgColor;
  }
  if (branding?.bgImageUrl) {
    // Voile sombre semi-opaque AU-DESSUS de la photo : garantit la lisibilité du texte
    // d'en-tête posé sur l'image (contraste WCAG), quelle que soit la photo.
    style.backgroundImage = `linear-gradient(rgba(13,15,23,0.62), rgba(13,15,23,0.62)), url("${branding.bgImageUrl}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
    style.backgroundRepeat = 'no-repeat';
    style.backgroundAttachment = 'fixed';
    // Sur photo voilée (sombre), le texte de page passe en clair par défaut si l'événement
    // n'a pas fixé sa propre couleur de texte.
    if (!branding.textColor) {
      style['--color-ink'] = '#f4f5f7';
      style['--color-ink-soft'] = 'rgba(244,245,247,0.82)';
      style['--color-ink-faint'] = 'rgba(244,245,247,0.6)';
    }
  }
  if (branding?.textColor) {
    // Texte de page (titre, intro). Les nuances « soft / faint » sont dérivées
    // par transparence pour rester lisibles sur n'importe quel fond.
    style['--color-ink'] = branding.textColor;
    style['--color-ink-soft'] = `color-mix(in oklab, ${branding.textColor} 78%, transparent)`;
    style['--color-ink-faint'] = `color-mix(in oklab, ${branding.textColor} 55%, transparent)`;
  }
  // Le conteneur doit DÉCLARER `color` pour que titres/textes héritent de la
  // surcharge (sinon ils héritent de la couleur calculée sur <body>).
  style.color = 'var(--color-ink)';
  style.minHeight = '100vh';
  return style as CSSProperties;
}
