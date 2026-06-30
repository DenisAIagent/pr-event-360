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
import { ResourcesPage } from './public-forms/ressources/ResourcesPage';
import type { ReactNode } from 'react';
import { AdminApp } from './admin/AdminApp';
import { isDomainMode } from './lib/domainEvent';

/** Enveloppe une page publique multilingue. */
function L({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
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
          <Route path="/newsroom" element={<NewsroomPage />} />
          <Route path="/newsroom/:slug" element={<PressReleasePage />} />
          <Route path="/connexion" element={<L><JournalistLoginPage /></L>} />
          <Route path="/mot-de-passe-oublie" element={<L><JournalistForgotPasswordPage /></L>} />
          <Route path="/reinitialiser" element={<L><JournalistResetPasswordPage /></L>} />
          <Route path="/espace/:token" element={<L><SpacePage /></L>} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/confidentialite" element={<PrivacyPage />} />
        <Route path="/ressources" element={<ResourcesPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
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
          path="/espace/:token"
          element={
            <I18nProvider>
              <SpacePage />
            </I18nProvider>
          }
        />
        <Route path="/newsroom/:eventId" element={<NewsroomPage />} />
        <Route path="/newsroom/:eventId/:slug" element={<PressReleasePage />} />
        <Route
          path="/espace-preview/:eventId"
          element={
            <I18nProvider>
              <SpacePreviewPage />
            </I18nProvider>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
