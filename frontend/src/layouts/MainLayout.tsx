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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Pilot environment indicator banner */}
      <div className="bg-emerald-900 px-4 py-1.5 text-center text-xs font-medium text-emerald-100 flex items-center justify-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>
          <strong>Pilot Live</strong>: Indiranagar Ward 82 & Koramangala 4th Block — Verified civic accountability workflow
        </span>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Citizen<span className="text-emerald-600">Civic</span>
              </span>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
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
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-white shadow-xs hover:bg-emerald-700 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
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
                  <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  title={t('nav.logout', 'Logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.login', 'Login')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-emerald-700"
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
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                <strong>CitizenCivic</strong> — Real-World Civic Resolution Engine &copy; 2026.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span>Verified Closure Protocol</span>
              <span>Recurring Hotspot Protection</span>
              <span>Role-Based Privacy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
