import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/Confirm';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminShell } from './components/AdminShell';
import { LoginPage } from './auth/LoginPage';
import { SubscribePage } from './auth/SubscribePage';
import { SubscribeSuccessPage } from './auth/SubscribeSuccessPage';
import { InviteSignupPage } from './auth/InviteSignupPage';
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
import { RevuePresseTab } from './pages/RevuePresseTab';
import { PreviewTab } from './pages/PreviewTab';
import { TeamPage } from './pages/TeamPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { ReviewPage } from './pages/ReviewPage';
import { ReviewsModerationPage } from './pages/ReviewsModerationPage';
import { SecurityPage } from './pages/SecurityPage';
import { EventWizard } from './pages/EventWizard';
import './admin.css';

/** Garde les routes réservées aux administrateurs (d'organisation). */
function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Garde les routes réservées au super-admin plateforme (intégrations partagées). */
function PlatformRoute() {
  const { user } = useAuth();
  if (!user?.isPlatformAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Sous-application back-office, montée sous /admin/* par le routeur principal. */
export function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ConfirmProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="abonnement" element={<SubscribePage />} />
        <Route path="abonnement/succes" element={<SubscribeSuccessPage />} />
        <Route path="inscription" element={<InviteSignupPage />} />
        <Route path="signup" element={<Navigate to="/admin/abonnement" replace />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminShell />}>
            <Route index element={<EventsListPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="avis" element={<ReviewPage />} />
            <Route path="events/new" element={<EventWizard />} />
            <Route element={<AdminRoute />}>
              <Route path="team" element={<TeamPage />} />
            </Route>
            <Route element={<PlatformRoute />}>
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="avis-moderation" element={<ReviewsModerationPage />} />
            </Route>
            <Route path="events/:eventId" element={<EventLayout />}>
              <Route index element={<Navigate to="requests" replace />} />
              <Route path="requests" element={<RequestsTab />} />
              <Route path="accreditations" element={<AccreditationsTab />} />
              <Route path="lineup" element={<LineupTab />} />
              <Route path="media" element={<MediaTab />} />
              <Route path="newsroom" element={<NewsroomTab />} />
              <Route path="communications" element={<CommunicationsTab />} />
              <Route path="revue-presse" element={<RevuePresseTab />} />
              <Route path="preview" element={<PreviewTab />} />
              <Route path="settings" element={<SettingsTab />} />
              <Route path="branding" element={<BrandingTab />} />
              <Route path="messages" element={<MessagesTab />} />
            </Route>
          </Route>
        </Route>
      </Routes>
      </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
