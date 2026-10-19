import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OfficerPortalPage from './pages/OfficerPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import ReportIssuePage from './pages/ReportIssuePage';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import RewardsPage from './pages/RewardsPage';
import MunicipalExplorerPage from './pages/MunicipalExplorerPage';
import NotFoundPage from './pages/NotFoundPage';

import './i18n';

/**
 * Intelligent Root Route:
 * - When authenticated: displays the user's role-based operational portal:
 *   - ADMIN -> AdminPortalPage
 *   - OPERATOR / MODERATOR / SUPERVISOR -> OfficerPortalPage
 *   - CITIZEN -> DashboardPage
 * - When unauthenticated: displays the public GovTech landing page with full civic resolution lifecycle.
 */
const RootHandler: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  if (user.role === 'ADMIN') return <AdminPortalPage />;
  if (['OPERATOR', 'MODERATOR', 'SUPERVISOR'].includes(user.role)) return <OfficerPortalPage />;
  return <DashboardPage />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            <Route element={<MainLayout />}>
              {/* Dynamic Root Route */}
              <Route path="/" element={<RootHandler />} />

              {/* Public Landing & Overview */}
              <Route path="/landing" element={<LandingPage />} />

              {/* Authenticated Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Municipal Officer Workspace */}
              <Route
                path="/officer"
                element={
                  <ProtectedRoute allowedRoles={['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN']}>
                    <OfficerPortalPage />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Platform Governance Admin Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPortalPage />
                  </ProtectedRoute>
                }
              />

              {/* Citizen Reporting Wizard */}
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <ReportIssuePage />
                  </ProtectedRoute>
                }
              />

              {/* Cases Directory & Auditing (Publicly Transparent) */}
              <Route path="/cases" element={<CaseListPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />

              {/* Community Karma & Leaderboard */}
              <Route path="/rewards" element={<RewardsPage />} />

              {/* Official Indian Municipal Data Explorer */}
              <Route path="/municipal" element={<MunicipalExplorerPage />} />
              <Route path="/municipal/:id" element={<MunicipalExplorerPage />} />

              {/* Public Authentication */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
