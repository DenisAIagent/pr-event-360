import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { AccreditationPage } from './public-forms/accreditation/AccreditationPage';
import { JournalistLoginPage } from './public-forms/auth/JournalistLoginPage';
import { JournalistForgotPasswordPage } from './public-forms/auth/JournalistForgotPasswordPage';
import { JournalistResetPasswordPage } from './public-forms/auth/JournalistResetPasswordPage';
import { SpacePage } from './public-forms/requests/SpacePage';
import { SpacePreviewPage } from './public-forms/requests/SpacePreviewPage';
import { NewsroomPage } from './public-forms/newsroom/NewsroomPage';
import { PressReleasePage } from './public-forms/newsroom/PressReleasePage';
import { LandingPage } from './public-forms/landing/LandingPage';
import { PrivacyPage } from './public-forms/legal/PrivacyPage';
import { LegalNoticePage } from './public-forms/legal/LegalNoticePage';
import { TermsPage } from './public-forms/legal/TermsPage';
import { ResourcesPage } from './public-forms/ressources/ResourcesPage';
import { NotFoundPage } from './public-forms/NotFoundPage';
import { ProductionSpacePage } from './public-forms/production/ProductionSpacePage';
import { LandingHeader } from './public-forms/landing/LandingHeader';
import { lazy, Suspense, type ReactNode } from 'react';
import { isDomainMode } from './lib/domainEvent';

// Back-office chargé à la demande : son code (la majorité du bundle) ne pèse pas
// sur les pages publiques (landing, newsroom, accréditation) → meilleur LCP/INP.
const AdminAppLazy = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })));

function AdminRoute() {
  return (
    <Suspense fallback={<main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Chargement…</main>}>
      <AdminAppLazy />
    </Suspense>
  );
}

/** Enveloppe une page publique multilingue. */
function L({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

/**
 * Coquille des pages institutionnelles (ressources, mentions légales, 404) :
 * elles n'avaient aucune navigation et leur seul retour était un lien en bas de
 * page. La landing porte déjà son propre en-tête.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingHeader />
      {children}
    </>
  );
}

/**
 * Routeur principal.
 * - /admin/*                : back-office (français, authentifié)
 * - /accreditation/:eventId : formulaire public d'accréditation (multilingue)
 * - /espace/:token          : espace journaliste (accès tokenisé)
 */
export function App() {
  // Mode domaine : l'app est servie sous le domaine d'un événement → surfaces publiques
  // à la racine (l'ID vient du contexte injecté, pas de l'URL).
  if (isDomainMode) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<L><AccreditationPage /></L>} />
          <Route path="/newsroom" element={<L><NewsroomPage /></L>} />
          <Route path="/newsroom/:slug" element={<L><PressReleasePage /></L>} />
          <Route path="/connexion" element={<L><JournalistLoginPage /></L>} />
          <Route path="/mot-de-passe-oublie" element={<L><JournalistForgotPasswordPage /></L>} />
          <Route path="/reinitialiser" element={<L><JournalistResetPasswordPage /></L>} />
          <Route path="/espace" element={<L><SpacePage /></L>} />
          <Route path="/espace/:token" element={<L><SpacePage /></L>} />
          <Route path="/prod" element={<L><ProductionSpacePage /></L>} />
          <Route path="/prod/:token" element={<L><ProductionSpacePage /></L>} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/mentions-legales" element={<LegalNoticePage />} />
          <Route path="/cgv" element={<TermsPage />} />
          <Route path="/admin/*" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/confidentialite" element={<Shell><PrivacyPage /></Shell>} />
        <Route path="/mentions-legales" element={<Shell><LegalNoticePage /></Shell>} />
        <Route path="/cgv" element={<Shell><TermsPage /></Shell>} />
        <Route path="/ressources" element={<Shell><ResourcesPage /></Shell>} />
        <Route path="/admin/*" element={<AdminRoute />} />
        <Route
          path="/accreditation/:eventId"
          element={
            <I18nProvider>
              <AccreditationPage />
            </I18nProvider>
          }
        />
        <Route
          path="/evenement/:eventId/connexion"
          element={
            <I18nProvider>
              <JournalistLoginPage />
            </I18nProvider>
          }
        />
        <Route
          path="/evenement/:eventId/mot-de-passe-oublie"
          element={
            <I18nProvider>
              <JournalistForgotPasswordPage />
            </I18nProvider>
          }
        />
        <Route
          path="/evenement/:eventId/reinitialiser"
          element={
            <I18nProvider>
              <JournalistResetPasswordPage />
            </I18nProvider>
          }
        />
        <Route
          path="/espace"
          element={
            <I18nProvider>
              <SpacePage />
            </I18nProvider>
          }
        />
        <Route
          path="/espace/:token"
          element={
            <I18nProvider>
              <SpacePage />
            </I18nProvider>
          }
        />
        {/* Espace de validation production : le jeton identifie le contact et
            son événement, d'où des chemins identiques dans les deux modes. */}
        <Route path="/prod" element={<L><ProductionSpacePage /></L>} />
        <Route path="/prod/:token" element={<L><ProductionSpacePage /></L>} />

        {/* Surfaces publiques lues par la presse étrangère : multilingues comme
            le formulaire d'accréditation. */}
        <Route path="/newsroom/:eventId" element={<L><NewsroomPage /></L>} />
        <Route path="/newsroom/:eventId/:slug" element={<L><PressReleasePage /></L>} />
        <Route
          path="/espace-preview/:eventId"
          element={
            <I18nProvider>
              <SpacePreviewPage />
            </I18nProvider>
          }
        />
        {/* 404 publique : une URL marketing mal saisie ne doit pas déposer un
            visiteur sur l'écran de connexion du back-office. */}
        <Route path="*" element={<Shell><NotFoundPage /></Shell>} />
      </Routes>
    </BrowserRouter>
  );
}
