import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { UserRole } from '@pulse/shared';
import { AppShell } from './components/AppShell';
import { LoginPage, OnboardingPage } from './pages/AuthPages';
import { ResidentHomePage, ProblemListPage } from './pages/ResidentPages';
import { CreateProblemPage } from './pages/CreateProblemPage';
import { ProblemDetailPage } from './pages/ProblemDetailPage';
import { MissionsPage, NotificationsPage, RatingPage, SettingsPage } from './pages/CommunityPages';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage, AnalyticsPage, AuditPage, ContractorDashboardPage, OperatorOverviewPage, OperatorQueuePage } from './pages/Workspaces';
import { useAppStore } from './store';
import { homeFor } from './navigation';

function Protected({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const user = useAppStore((s) => s.user); if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
function IndexRedirect() { const user = useAppStore((s) => s.user); const onboarding = useAppStore((s) => s.onboardingDone); return <Navigate to={user ? homeFor(user.role) : onboarding ? '/login' : '/onboarding'} replace />; }

export function App() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return <Routes>
    <Route path="/" element={<IndexRedirect />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<Protected><AppShell /></Protected>}>
      <Route path="/map" element={<Protected roles={['RESIDENT']}><ResidentHomePage /></Protected>} />
      <Route path="/problems" element={<ProblemListPage />} />
      <Route path="/problems/new" element={<Protected roles={['RESIDENT', 'ADMIN']}><CreateProblemPage /></Protected>} />
      <Route path="/problems/:id" element={<ProblemDetailPage />} />
      <Route path="/missions" element={<MissionsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/my-problems" element={<ProblemListPage mode="mine" />} />
      <Route path="/subscriptions" element={<ProblemListPage mode="subscriptions" />} />
      <Route path="/rating" element={<RatingPage />} />
      <Route path="/settings" element={<SettingsPage />} />

      <Route path="/operator" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorOverviewPage /></Protected>} />
      <Route path="/operator/queue" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorQueuePage /></Protected>} />
      <Route path="/operator/map" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorQueuePage mode="map" /></Protected>} />
      <Route path="/operator/overdue" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorQueuePage mode="overdue" /></Protected>} />
      <Route path="/operator/disputed" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorQueuePage mode="disputed" /></Protected>} />
      <Route path="/operator/contractors" element={<Protected roles={['OPERATOR', 'ADMIN']}><OperatorQueuePage mode="contractors" /></Protected>} />
      <Route path="/operator/analytics" element={<Protected roles={['OPERATOR', 'ADMIN']}><AnalyticsPage /></Protected>} />
      <Route path="/operator/audit" element={<Protected roles={['OPERATOR', 'ADMIN']}><AuditPage /></Protected>} />

      <Route path="/contractor" element={<Protected roles={['CONTRACTOR']}><ContractorDashboardPage /></Protected>} />
      <Route path="/admin" element={<Protected roles={['ADMIN']}><AdminPage /></Protected>} />
      <Route path="/admin/users" element={<Protected roles={['ADMIN']}><AdminPage usersOnly /></Protected>} />
    </Route>
    <Route path="*" element={<div className="not-found"><h1>Страница не найдена</h1><a href="/">Вернуться в «Пульс города»</a></div>} />
  </Routes>;
}
