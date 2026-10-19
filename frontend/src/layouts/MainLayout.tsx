import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  PlusCircle,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Pilot environment indicator banner with Neon Realtime */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-1.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-200">Active Locality:</span>
            <span className="text-slate-400">Indiranagar Ward 82 & Koramangala 4th Block · Verified Civic Resolution</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Neon Realtime Active</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white shadow-2xs group-hover:bg-slate-800 transition-colors">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Citizen<span className="text-emerald-700">Civic</span>
              </span>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Accountable Civic Resolution
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            {user && (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${
                    isActive('/') ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>

                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${
                    isActive('/cases') ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'hover:bg-slate-100'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>{user.role === 'CITIZEN' ? t('nav.cases', 'My Cases') : t('cases.allCases', 'All Cases')}</span>
                </Link>

                {user.role === 'CITIZEN' && (
                  <Link
                    to="/report"
                    className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-white shadow-2xs hover:bg-slate-800 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4 text-emerald-400" />
                    <span>{t('nav.report', 'Report Issue')}</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Header: Language & User Menu */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {user ? (
              <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-3">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800">{user.display_name}</span>
                  <span className="text-[10px] font-mono font-medium tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-xs">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  title={t('nav.logout', 'Logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t('nav.login', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-slate-800 transition-colors"
                >
                  {t('nav.register', 'Register')}
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden space-y-2">
            {user ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.display_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                </div>

                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>

                <Link
                  to="/cases"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                  <span>{user.role === 'CITIZEN' ? t('nav.cases', 'My Cases') : t('cases.allCases', 'All Cases')}</span>
                </Link>

                {user.role === 'CITIZEN' && (
                  <Link
                    to="/report"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>{t('nav.report', 'Report Issue')}</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('nav.logout', 'Logout')}</span>
                </button>
              </>
            ) : (
              <div className="space-y-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.login', 'Login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white text-center"
                >
                  {t('nav.register', 'Register')}
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Action Button on mobile for citizens */}
      {user && user.role === 'CITIZEN' && !isActive('/report') && (
        <div className="fixed bottom-6 right-6 z-30 md:hidden">
          <Link
            to="/report"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 active:scale-95 transition-all"
            title={t('nav.report', 'Report Issue')}
          >
            <PlusCircle className="h-7 w-7" />
          </Link>
        </div>
      )}

      {/* Standard Civic Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                <strong>CitizenCivic</strong> — Real-World Civic Resolution Platform &copy; 2026.
              </span>
            </div>
            <div className="flex items-center gap-5 text-slate-400">
              <span>Verified Closure Protocol</span>
              <span>Recurring Hotspot Protection</span>
              <span>Role-Based Audit Trail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
