import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReportIssuePage from './pages/ReportIssuePage';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import NotFoundPage from './pages/NotFoundPage';

import './i18n';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
          <Route element={<MainLayout />}>
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN']}>
                  <ReportIssuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases"
              element={
                <ProtectedRoute>
                  <CaseListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases/:id"
              element={
                <ProtectedRoute>
                  <CaseDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
