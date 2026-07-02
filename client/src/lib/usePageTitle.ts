import { useEffect } from 'react';

const DEFAULT_TITLE = 'PR Event 360 — Votre orchestrateur de relations presse';

/**
 * Met à jour `document.title` au montage (et à chaque changement de titre).
 * Complète l'injection serveur des balises SEO : au premier chargement le serveur
 * sert déjà le bon `<title>`, ce hook couvre les navigations SPA suivantes.
 */
export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? title : DEFAULT_TITLE;
  }, [title]);
}
