import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './auth/LoginPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { ResetPasswordPage } from './auth/ResetPasswordPage';
import { AcceptInvitePage } from './auth/AcceptInvitePage';
import { EventsListPage } from './pages/EventsListPage';
import { EventLayout } from './pages/EventLayout';
import { RequestsTab } from './pages/RequestsTab';
import { AccreditationsTab } from './pages/AccreditationsTab';
import { LineupTab } from './pages/LineupTab';
import { SettingsTab } from './pages/SettingsTab';
import { BrandingTab } from './pages/BrandingTab';
import { MessagesTab } from './pages/MessagesTab';
import { MediaTab } from './pages/MediaTab';
import { NewsroomTab } from './pages/NewsroomTab';
import { CommunicationsTab } from './pages/CommunicationsTab';
import { PreviewTab } from './pages/PreviewTab';
import { TeamPage } from './pages/TeamPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { EventWizard } from './pages/EventWizard';
import './admin.css';

/** Garde les routes réservées aux administrateurs. */
function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Sous-application back-office, montée sous /admin/* par le routeur principal. */
export function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route index element={<EventsListPage />} />
          <Route path="events/new" element={<EventWizard />} />
          <Route element={<AdminRoute />}>
            <Route path="team" element={<TeamPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
          </Route>
          <Route path="events/:eventId" element={<EventLayout />}>
            <Route index element={<Navigate to="requests" replace />} />
            <Route path="requests" element={<RequestsTab />} />
            <Route path="accreditations" element={<AccreditationsTab />} />
            <Route path="lineup" element={<LineupTab />} />
            <Route path="media" element={<MediaTab />} />
            <Route path="newsroom" element={<NewsroomTab />} />
            <Route path="communications" element={<CommunicationsTab />} />
            <Route path="preview" element={<PreviewTab />} />
            <Route path="settings" element={<SettingsTab />} />
            <Route path="branding" element={<BrandingTab />} />
            <Route path="messages" element={<MessagesTab />} />
          </Route>
        </Route>
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
