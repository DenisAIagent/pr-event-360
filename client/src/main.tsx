import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
// Polices auto-hébergées (RGPD : aucun appel au CDN Google, donc pas de transfert
// de l'IP des visiteurs vers Google/US sans consentement — cf. LG München 2022).
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import { App } from './App';
import './styles/global.css';

// Sentry — dormant sans VITE_SENTRY_DSN (même pattern que Stripe côté serveur).
// Erreurs uniquement, pas de replay ni de tracing : télémétrie minimale.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, environment: import.meta.env.MODE, sendDefaultPii: false });
}

/** Écran de secours : plus jamais de page blanche muette en cas de crash React. */
function CrashFallback() {
  return (
    <main className="page">
      <div className="card stack" role="alert">
        <h1>Une erreur est survenue</h1>
        <p className="muted">
          L'équipe est notifiée. Rechargez la page pour reprendre — si le problème persiste,
          contactez le support.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Recharger la page
        </button>
      </div>
    </main>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Élément #root introuvable');

createRoot(rootEl).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
