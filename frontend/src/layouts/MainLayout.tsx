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
  Award,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Badge from '../components/ui/Badge';

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
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* Main Navigation Header: ~80px Tall Premium Civic Shell */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs min-h-[76px] sm:min-h-[80px] flex items-center">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white shadow-2xs group-hover:bg-slate-800 transition-colors">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-950">
                Citizen<span className="text-emerald-700">Civic</span>
              </span>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Civic Accountability Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-[15px] font-medium text-slate-700">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/dashboard') || isActive('/')
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>

                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/cases')
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>{user.role === 'CITIZEN' ? t('nav.cases', 'My Reports') : t('cases.allCases', 'Cases Directory')}</span>
                </Link>

                <Link
                  to="/rewards"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/rewards')
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Award className="h-4 w-4" />
                  <span>{t('nav.karma', 'Community Karma')}</span>
                </Link>

                <Link
                  to="/municipal"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/municipal')
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                  <span>{t('nav.municipal', 'Municipal Data')}</span>
                </Link>

                {user.role === 'CITIZEN' && (
                  <Link
                    to="/report"
                    className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-1.5 text-[15px] font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors ml-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>{t('nav.report', 'Report Issue')}</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/') ? 'text-slate-950 font-semibold bg-slate-100' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>{t('nav.overview', 'Overview')}</span>
                </Link>

                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/cases') ? 'text-slate-950 font-semibold bg-slate-100' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>{t('nav.publicCases', 'Public Cases')}</span>
                </Link>

                <Link
                  to="/rewards"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/rewards') ? 'text-slate-950 font-semibold bg-slate-100' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>{t('nav.karma', 'Community Karma')}</span>
                </Link>

                <Link
                  to="/municipal"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    isActive('/municipal') ? 'text-slate-950 font-semibold bg-slate-100' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                  <span>{t('nav.municipal', 'Municipal Data')}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Header Controls: Language & Account */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {user ? (
              <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-3">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.display_name}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-emerald-800 uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                  title={t('nav.logout', 'Logout')}
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t('nav.login', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
                >
                  {t('nav.register', 'Register')}
                </Link>
              </div>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden rounded-md p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                    <p className="text-xs font-bold text-slate-900">{user.display_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                  </div>
                  <Badge variant="emerald" size="xs">
                    {user.role}
                  </Badge>
                </div>

                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="h-4 w-4 text-slate-500" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>

                <Link
                  to="/cases"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <span>{user.role === 'CITIZEN' ? t('nav.cases', 'My Reports') : t('cases.allCases', 'Cases Directory')}</span>
                </Link>

                <Link
                  to="/rewards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Award className="h-4 w-4 text-slate-500" />
                  <span>{t('nav.karma', 'Community Karma')}</span>
                </Link>

                <Link
                  to="/municipal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Landmark className="h-4 w-4 text-slate-500" />
                  <span>{t('nav.municipal', 'Municipal Data')}</span>
                </Link>

                {user.role === 'CITIZEN' && (
                  <Link
                    to="/report"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('nav.logout', 'Logout')}</span>
                </button>
              </>
            ) : (
              <div className="space-y-1.5 pt-1">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.overview', 'Overview')}
                </Link>
                <Link
                  to="/cases"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.publicCases', 'Public Cases')}
                </Link>
                <Link
                  to="/rewards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.karma', 'Community Karma')}
                </Link>
                <Link
                  to="/municipal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('nav.municipal', 'Municipal Data')}
                </Link>
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-md border border-slate-300 py-2 text-center text-xs font-semibold text-slate-800"
                  >
                    {t('nav.login', 'Sign In')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-md bg-slate-900 py-2 text-center text-xs font-semibold text-white"
                  >
                    {t('nav.register', 'Register')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Action Button for Citizens on Mobile */}
      {user && user.role === 'CITIZEN' && !isActive('/report') && (
        <div className="fixed bottom-6 right-6 z-30 md:hidden">
          <Link
            to="/report"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl hover:bg-emerald-800 active:scale-95 transition-all"
            title={t('nav.report', 'Report Issue')}
          >
            <PlusCircle className="h-6 w-6" />
          </Link>
        </div>
      )}

      {/* Institutional Civic Footer */}
      <footer className="border-t border-slate-200 bg-white py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong className="text-slate-800">CitizenCivic</strong> — {t('landing.footer.platform', 'Civic Accountability Platform')} &copy; {new Date().getFullYear()}. {t('landing.footer.rights', 'All rights reserved.')}
            </span>
          </div>
          <div className="flex items-center gap-5 text-slate-600 font-medium">
            <Link to="/cases" className="hover:text-slate-900 transition-colors">
              {t('landing.footer.publicCases', 'Public Cases')}
            </Link>
            <Link to="/rewards" className="hover:text-slate-900 transition-colors">
              {t('landing.footer.communityKarma', 'Community Karma')}
            </Link>
            <Link to="/municipal" className="hover:text-slate-900 transition-colors">
              {t('nav.municipal', 'Municipal Data')}
            </Link>
            <Link to={user ? '/report' : '/login'} className="hover:text-emerald-800 transition-colors">
              {t('landing.footer.reportIssue', 'Report an Issue')}
            </Link>
            <span className="text-slate-400 font-mono text-[11px] hidden md:inline">
              {t('landing.footer.independent', 'Independent Civic Tech')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
