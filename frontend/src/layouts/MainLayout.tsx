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
  Bell,
  ChevronDown,
  Compass,
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* Main Navigation Header: Clean White with 1px border */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md min-h-[72px] sm:min-h-[76px] flex items-center shadow-xs">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-xs group-hover:bg-slate-800 transition-colors">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-950">
                Citizen<span className="text-emerald-700">Civic</span>
              </span>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-medium">
                Civic Accountability Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/dashboard') || isActive('/')
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>

                <Link
                  to="/cases?scope=mine"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/cases') && location.search.includes('scope=mine')
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>{user.role === 'CITIZEN' ? t('nav.cases', 'My Reports') : t('cases.allCases', 'Cases Directory')}</span>
                </Link>

                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/cases') && !location.search.includes('scope=mine')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t('nav.publicCases', 'Public Cases')}</span>
                </Link>

                <Link
                  to="/rewards"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/rewards')
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>{t('nav.karma', 'Community Karma')}</span>
                </Link>

                <Link
                  to="/municipal"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/municipal')
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>{t('nav.municipal', 'Municipal Data')}</span>
                  <span className="text-[9px] font-mono uppercase bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">New</span>
                </Link>

                {user.role === 'CITIZEN' && (
                  <Link
                    to="/report"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all ml-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{t('nav.report', 'Report Issue')}</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/') ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{t('nav.overview', 'Overview')}</span>
                </Link>

                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/cases') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{t('nav.publicCases', 'Public Cases')}</span>
                </Link>

                <Link
                  to="/rewards"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/rewards') ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{t('nav.karma', 'Community Karma')}</span>
                </Link>

                <Link
                  to="/municipal"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/municipal') ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>{t('nav.municipal', 'Municipal Data')}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Header Controls: Language, Notification Bell & Account */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification Bell */}
            <div className="relative p-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                1
              </span>
            </div>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group focus:outline-hidden"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-emerald-400 bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-800">
                    {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {user.display_name}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-lg border border-slate-200 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user.display_name}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/rewards"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Community Karma
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{t('nav.logout', 'Logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t('nav.login', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
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
