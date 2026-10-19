import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match.'));
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email,
        password,
        display_name: displayName,
        preferred_language: preferredLanguage,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        t('auth.registerError', 'Registration failed. Please check inputs.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-10 antialiased">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-xl mx-auto w-full">
        <Link to="/login" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
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
        <LanguageSwitcher />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-7 sm:p-8 shadow-2xs">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('auth.register', 'Create Citizen Account')}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Join your locality to report, verify, and resolve civic infrastructure issues.
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
                htmlFor="displayName"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.displayName', 'Full Name')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="displayName"
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.email', 'Email Address')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.password', 'Password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.confirmPassword', 'Confirm Password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="preferredLanguage"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('auth.language', 'Preferred Language')}
              </label>
              <select
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs bg-white"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
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
                  <span>{t('auth.register', 'Create Account')}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>{t('auth.hasAccount', 'Already have an account?')} </span>
            <Link
              to="/login"
              className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {t('auth.loginLink', 'Sign In')}
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle bottom note */}
      <div className="text-center text-xs text-slate-400">
        <span>CitizenCivic &middot; Real-World Civic Resolution Platform &copy; 2026</span>
      </div>
    </div>
  );
};

export default RegisterPage;
