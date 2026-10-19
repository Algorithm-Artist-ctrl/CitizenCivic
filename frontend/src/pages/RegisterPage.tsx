import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowLeft,
  Globe,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/ui/Button';

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
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        t('auth.registerError', 'Registration failed. Please check inputs and try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Top Header */}
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
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
            >
              Already registered? <span className="underline">Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-2xs border border-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Create Citizen Account
            </h1>
            <p className="text-xs text-slate-500">
              Join the verified municipal resolution network for Bengaluru Ward 82
            </p>
          </div>

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
              {/* Full Name / Display Pseudonym */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-display-name"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Full Name or Public Handle
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Ramesh K. or Indiranagar Resident"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Preferred Language */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-language"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Notification Language
                </label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    id="register-language"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-xs text-slate-900 bg-white focus:border-slate-900 focus:outline-hidden"
                  >
                    <option value="en">English (English)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full py-2.5"
                >
                  Complete Registration &rarr;
                </Button>
              </div>
            </form>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            By registering, you agree to the Civic Resolution Verification Standards and anti-fraud guidelines.
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        CitizenCivic Accountability Engine &copy; 2026 · Bengaluru Ward 82 Pilot
      </footer>
    </div>
  );
};

export default RegisterPage;
