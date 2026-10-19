import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Camera,
  Clock,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          t('auth.loginError', 'Invalid email or password. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-12 antialiased">
      {/* Left panel — Brand, vision, and verified resolution workflow */}
      <section className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-slate-950 text-slate-100 flex-col justify-between p-10 xl:p-14 border-r border-slate-800/80 relative">
        {/* Subtle architectural background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Brand identity */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                Citizen<span className="text-emerald-400">Civic</span>
              </span>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Civic Accountability Platform
              </p>
            </div>
          </div>
        </div>

        {/* Narrative and Resolution Workflow Card */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Verified Resolution System</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
            {t('auth.headline', 'Civic issues deserve verified resolutions.')}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-md">
            {t(
              'auth.headlineDesc',
              'Citizens report local issues with verified ground evidence. Authorized operators take action. Resolving an issue requires photographic proof and independent verification before closure.'
            )}
          </p>

          {/* Precision Workflow Schematic Card */}
          <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/70 p-5 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  Resolution Protocol
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-xs">
                Case #CC-2026-0842
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold mt-0.5">
                  <Camera className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-200">1. Observation & Ground Evidence</p>
                    <span className="font-mono text-[10px] text-slate-500">12.9716°N, 77.6412°E</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Citizen reports accumulation with mandatory photo and GPS lock.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold mt-0.5">
                  <MapPin className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-200">2. Jurisdiction & Operator Routing</p>
                    <span className="font-mono text-[10px] text-slate-500">Ward 82 Match</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Assigned strictly to designated local field crew; requires formal receipt.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400 border border-slate-700 text-[10px] font-mono font-bold mt-0.5">
                  <Clock className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-200">3. Remediation & Closure Claim</p>
                    <span className="font-mono text-[10px] text-amber-400">Claimed ≠ Resolved</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Field operator uploads after-cleanup photo. Flagged for verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-emerald-300">4. Independent Verification</p>
                    <span className="font-mono text-[10px] text-emerald-400">Audit Confirmed</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Citizen review or 48-hour dispute window required before final closure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info in left panel */}
        <div className="relative z-10 border-t border-slate-800/80 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Pilot: Indiranagar Ward 82 & Koramangala 4th Block</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Immutable Audit Trail
          </div>
        </div>
      </section>

      {/* Right panel — Compact, balanced login form */}
      <main className="col-span-12 lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white min-h-screen">
        {/* Top bar with mobile logo and language switcher */}
        <div className="flex items-center justify-between">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Citizen<span className="text-emerald-700">Civic</span>
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Center form container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8 sm:py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('auth.welcomeBack', 'Welcome back')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('auth.loginSubtitle', 'Sign in to access your civic reporting and resolution dashboard.')}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.email', 'Email Address')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder', 'you@example.com')}
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.password', 'Password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 py-2.5 px-4 text-sm font-medium text-white shadow-2xs hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{t('auth.signIn', 'Sign In')}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>{t('auth.noAccount', "Don't have an account?")} </span>
            <Link
              to="/register"
              className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {t('auth.registerLink', 'Register as Citizen')}
            </Link>
          </div>

          {/* Discreet collapsible evaluation credentials for local testing */}
          <details className="mt-8 pt-4 border-t border-slate-200/80 group">
            <summary className="cursor-pointer text-[11px] font-mono text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-slate-400" />
                <span>Evaluation Credentials</span>
              </span>
              <span className="text-[10px] text-slate-400 group-open:hidden">Expand</span>
            </summary>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setDemoRole('citizen@example.com', 'Citizen123!')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-900">Citizen</span>
                <span className="text-[10px] text-slate-500">citizen@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('moderator@example.com', 'Moderator123!')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-900">Moderator</span>
                <span className="text-[10px] text-slate-500">moderator@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('operator@example.com', 'Operator123!')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-900">Operator</span>
                <span className="text-[10px] text-slate-500">operator@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('supervisor@example.com', 'Supervisor123!')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-900">Supervisor</span>
                <span className="text-[10px] text-slate-500">supervisor@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('admin@example.com', 'Admin123!')}
                className="col-span-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-900">Admin</span>
                <span className="text-[10px] text-slate-500">admin@example.com</span>
              </button>
            </div>
          </details>
        </div>

        {/* Quiet footer */}
        <div className="text-center text-xs text-slate-400 pt-6">
          <span>Protected by verified audit logging &middot; &copy; 2026 CitizenCivic</span>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
