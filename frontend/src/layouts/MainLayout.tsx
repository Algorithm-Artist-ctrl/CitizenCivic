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
  Award,
  Landmark,
  Bell,
  ChevronDown,
  Compass,
  ShieldCheck,
  KeyRound,
  Home,
  Folder,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Badge from '../components/ui/Badge';
import CivicAIAssistant from '../components/CivicAIAssistant';

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
                {/* Admin-specific links */}
                {user.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/admin"
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                        isActive('/admin') || isActive('/')
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'hover:bg-purple-50 text-purple-900 font-bold'
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5 text-purple-400" />
                      <span>Admin Console</span>
                    </Link>
                    <Link
                      to="/officer"
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                        isActive('/officer')
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                      <span>Officer Queue</span>
                    </Link>
                  </>
                )}

                {/* Officer-specific links */}
                {['OPERATOR', 'MODERATOR', 'SUPERVISOR'].includes(user.role) && (
                  <Link
                    to="/officer"
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                      isActive('/officer') || isActive('/')
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'hover:bg-blue-50 text-blue-900 font-bold'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span>Officer Queue</span>
                  </Link>
                )}

                {/* Citizen-specific links */}
                {user.role === 'CITIZEN' && (
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
                      <span>{t('nav.cases', 'My Reports')}</span>
                    </Link>
                  </>
                )}

                {/* Universal civic transparency links */}
                <Link
                  to="/cases"
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all ${
                    isActive('/cases') && !location.search.includes('scope=mine')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{user.role === 'CITIZEN' ? t('nav.publicCases', 'Public Cases') : 'Cases Directory'}</span>
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
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                <Link
                  to="/"
                  className={`relative flex items-center gap-1.5 py-1.5 px-3 transition-colors ${
                    isActive('/') ? 'text-slate-950 font-bold' : 'hover:text-slate-950'
                  }`}
                >
                  <Home className="h-4 w-4 text-slate-800" />
                  <span>{t('nav.overview', 'Overview')}</span>
                  {isActive('/') && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-1 w-10 bg-emerald-600 rounded-full" />
                  )}
                </Link>

                <Link
                  to="/cases"
                  className={`relative flex items-center gap-1.5 py-1.5 px-3 transition-colors ${
                    isActive('/cases') ? 'text-slate-950 font-bold' : 'hover:text-slate-950'
                  }`}
                >
                  <Folder className="h-4 w-4 text-slate-500" />
                  <span>{t('nav.publicCases', 'Public Cases')}</span>
                  {isActive('/cases') && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-1 w-10 bg-emerald-600 rounded-full" />
                  )}
                </Link>

                <Link
                  to="/rewards"
                  className={`relative flex items-center gap-1.5 py-1.5 px-3 transition-colors ${
                    isActive('/rewards') ? 'text-slate-950 font-bold' : 'hover:text-slate-950'
                  }`}
                >
                  <Award className="h-4 w-4 text-slate-500" />
                  <span>{t('nav.karma', 'Community Karma')}</span>
                  {isActive('/rewards') && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-1 w-10 bg-emerald-600 rounded-full" />
                  )}
                </Link>
              </div>
            )}
          </nav>

          {/* Right Header Controls: Language, Notification Bell & Account */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {user ? (
              <>
                {/* Notification Bell (for authenticated users) */}
                <div className="relative p-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer" title="Notifications">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    1
                  </span>
                </div>

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
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block rounded-lg px-3 py-2 text-purple-700 hover:bg-purple-50 transition-colors font-semibold"
                        >
                          ⚡ Admin Console
                        </Link>
                      )}
                      {['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user.role) && (
                        <Link
                          to="/officer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block rounded-lg px-3 py-2 text-blue-700 hover:bg-blue-50 transition-colors font-semibold"
                        >
                          🛡️ Officer Queue
                        </Link>
                      )}
                      {user.role === 'CITIZEN' && (
                        <Link
                          to="/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Dashboard
                        </Link>
                      )}
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
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('nav.login', 'Login')}</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-200" />
                  <span>{t('nav.register', 'Register')}</span>
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

                {user.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900"
                    >
                      <KeyRound className="h-4 w-4 text-purple-600" />
                      <span>Admin Console</span>
                    </Link>
                    <Link
                      to="/officer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span>Officer Queue</span>
                    </Link>
                  </>
                )}

                {['OPERATOR', 'MODERATOR', 'SUPERVISOR'].includes(user.role) && (
                  <Link
                    to="/officer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span>Officer Queue</span>
                  </Link>
                )}

                {user.role === 'CITIZEN' && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-500" />
                      <span>{t('nav.dashboard', 'Dashboard')}</span>
                    </Link>

                    <Link
                      to="/cases?scope=mine"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <ClipboardList className="h-4 w-4 text-slate-500" />
                      <span>{t('nav.cases', 'My Reports')}</span>
                    </Link>
                  </>
                )}

                <Link
                  to="/cases"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Compass className="h-4 w-4 text-slate-500" />
                  <span>{user.role === 'CITIZEN' ? t('nav.publicCases', 'Public Cases') : 'Cases Directory'}</span>
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

      {/* Institutional Civic Footer matching Reference Image 2 */}
      <footer className="border-t border-slate-200/80 bg-white py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 text-sm">🍃</span>
            <span>
              <strong className="text-slate-900 font-semibold">CitizenCivic</strong> — {t('landing.footer.platform', 'Civic Accountability Platform')} &copy; {new Date().getFullYear()}.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-slate-600">
            <Link to="/" className="hover:text-slate-950 transition-colors">
              About
            </Link>
            <Link to="/cases" className="hover:text-slate-950 transition-colors">
              {t('landing.footer.publicCases', 'Public Cases')}
            </Link>
            <Link to="/rewards" className="hover:text-slate-950 transition-colors">
              {t('landing.footer.communityKarma', 'Community Karma')}
            </Link>
            <a href="mailto:contact@citizencivic.org" className="hover:text-slate-950 transition-colors">
              Contact
            </a>
            <div className="flex items-center gap-3 text-slate-400 pl-3 border-l border-slate-200">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors" aria-label="Twitter">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors" aria-label="LinkedIn">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors" aria-label="YouTube">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42A2.5 2.5 0 0 0 2.42 7.19C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM9.75 15.02V8.98L15 12l-5.25 3.02z"/></svg>
              </a>
              <a href="https://github.com/Algorithm-Artist-ctrl/CitizenCivic" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors" aria-label="GitHub">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 24x7 Civic AI Assistant Widget */}
      <CivicAIAssistant />
    </div>
  );
};

export default MainLayout;
