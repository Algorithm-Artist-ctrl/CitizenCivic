import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Quick-fill credentials helper for pilot evaluation
  const setDemoRole = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            {t('auth.login', 'Sign in to CitizenCivic')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('app.tagline', 'Direct, verifiable accountability for civic resolution')}
          </p>
        </div>

        {/* Demo Fast-Login Pill Selection for Pilot */}
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pilot Test Roles (1-Click Fill):</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoRole('citizen@example.com', 'Citizen123!')}
              className="rounded-md bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('moderator@example.com', 'Moderator123!')}
              className="rounded-md bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              Moderator
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('operator@example.com', 'Operator123!')}
              className="rounded-md bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('supervisor@example.com', 'Supervisor123!')}
              className="rounded-md bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              Supervisor
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('admin@example.com', 'Admin123!')}
              className="rounded-md bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t('auth.email', 'Email Address')}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t('auth.password', 'Password')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{t('auth.login', 'Sign In')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          <span>{t('auth.noAccount', "Don't have an account?")} </span>
          <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
            {t('auth.registerLink', 'Register as Citizen')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
