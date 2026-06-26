import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { AccreditationPage } from './public-forms/accreditation/AccreditationPage';
import { SpacePage } from './public-forms/requests/SpacePage';
import { SpacePreviewPage } from './public-forms/requests/SpacePreviewPage';
import { NewsroomPage } from './public-forms/newsroom/NewsroomPage';
import { LandingPage } from './public-forms/landing/LandingPage';
import { AdminApp } from './admin/AdminApp';

/**
 * Routeur principal.
 * - /admin/*                : back-office (français, authentifié)
 * - /accreditation/:eventId : formulaire public d'accréditation (multilingue)
 * - /espace/:token          : espace journaliste (accès tokenisé)
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route
          path="/accreditation/:eventId"
          element={
            <I18nProvider initialLang="fr">
              <AccreditationPage />
            </I18nProvider>
          }
        />
        <Route
          path="/espace/:token"
          element={
            <I18nProvider initialLang="fr">
              <SpacePage />
            </I18nProvider>
          }
        />
        <Route path="/newsroom/:eventId" element={<NewsroomPage />} />
        <Route
          path="/espace-preview/:eventId"
          element={
            <I18nProvider initialLang="fr">
              <SpacePreviewPage />
            </I18nProvider>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
