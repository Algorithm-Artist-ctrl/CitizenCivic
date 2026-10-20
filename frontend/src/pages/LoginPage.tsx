import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Users,
  Shield,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/ui/Button';

export type PortalType = 'citizen' | 'officer' | 'admin';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active portal tab: 'citizen' | 'officer' | 'admin'
  const initialPortal = (searchParams.get('portal') as PortalType) || 'citizen';
  const [activePortal, setActivePortal] = useState<PortalType>(
    ['citizen', 'officer', 'admin'].includes(initialPortal) ? initialPortal : 'citizen'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = searchParams.get('portal') as PortalType;
    if (p && ['citizen', 'officer', 'admin'].includes(p)) {
      setActivePortal(p);
    }
  }, [searchParams]);

  const handlePortalChange = (portal: PortalType) => {
    setActivePortal(portal);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('portal', portal);
      return next;
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const authUser = await login({ email: email.trim(), password });

      // Authoritative Role Redirection based on verified server role
      const requestedFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;

      if (authUser.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (['OPERATOR', 'MODERATOR', 'SUPERVISOR'].includes(authUser.role)) {
        navigate('/officer', { replace: true });
      } else {
        // Citizen redirect
        const target = requestedFrom && !requestedFrom.includes('/login') && !requestedFrom.includes('/officer') && !requestedFrom.includes('/admin')
          ? requestedFrom
          : '/dashboard';
        navigate(target, { replace: true });
      }
    } catch (err: any) {
      console.error('Login error', err);
      setError(
        err.response?.data?.detail ||
          t('auth.loginError', 'Invalid credentials. Please verify your email and password.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Top minimal header */}
      <header className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
            <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              Back to Public Portal
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {activePortal === 'citizen' ? (
              <Link
                to="/register"
                className="text-xs font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
              >
                Need a Citizen account? <span className="underline">Register</span>
              </Link>
            ) : (
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Authorized Personnel Only
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Brand & Masthead */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-2xs border border-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              Sign In to CitizenCivic
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select your authorized access portal to enter your dedicated operational workspace
            </p>
          </div>

          {/* 3 Portal Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/70 rounded-xl border border-slate-300/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handlePortalChange('citizen')}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all cursor-pointer ${
                activePortal === 'citizen'
                  ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Users className={`h-4 w-4 ${activePortal === 'citizen' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="font-bold">Citizen</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Public Resident</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalChange('officer')}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all cursor-pointer ${
                activePortal === 'officer'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Shield className={`h-4 w-4 ${activePortal === 'officer' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="font-bold">Officer</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Field & Triage</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalChange('admin')}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all cursor-pointer ${
                activePortal === 'admin'
                  ? 'bg-white text-purple-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <KeyRound className={`h-4 w-4 ${activePortal === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span className="font-bold">Admin</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Governance</span>
            </button>
          </div>

          {/* Selected Portal Banner */}
          <div
            className={`rounded-xl p-3.5 border text-xs flex items-center justify-between ${
              activePortal === 'citizen'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : activePortal === 'officer'
                ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                : 'bg-purple-50/70 border-purple-200 text-purple-950'
            }`}
          >
            <div>
              <div className="font-bold flex items-center gap-1.5">
                {activePortal === 'citizen' && '👤 Citizen Portal — Public Reporting'}
                {activePortal === 'officer' && '🛡️ Municipal Officer Portal — Field Operations'}
                {activePortal === 'admin' && '⚡ Administrator Portal — System Governance'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {activePortal === 'citizen' && 'Report civic issues, track ward resolution progress, and earn verified karma.'}
                {activePortal === 'officer' && 'For authorized field operators, review moderators, and ward supervisors.'}
                {activePortal === 'admin' && 'System administration, user roster management, and operational auditing.'}
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email-address"
                  className="block text-xs font-semibold text-slate-800"
                >
                  {activePortal === 'citizen' ? 'Registered Citizen Email' : 'Official Email Address'}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="email-address"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="account-password"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="account-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className={`w-full py-2.5 ${
                    activePortal === 'officer'
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : activePortal === 'admin'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  Sign In to {activePortal === 'citizen' ? 'Citizen Portal' : activePortal === 'officer' ? 'Officer Portal' : 'Admin Portal'} &rarr;
                </Button>
              </div>
            </form>


          </div>

          {/* Informational security footnote */}
          <div className="text-center text-[11px] text-slate-500">
            {activePortal === 'citizen' ? (
              <span>Public accounts strictly operate as verified residents. No staff privileges.</span>
            ) : (
              <span>Official accounts require cryptographic server verification before access is granted.</span>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        CitizenCivic Accountability Platform &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default LoginPage;
