import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Polices auto-hébergées (RGPD : aucun appel au CDN Google, donc pas de transfert
// de l'IP des visiteurs vers Google/US sans consentement — cf. LG München 2022).
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import { App } from './App';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Élément #root introuvable');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
