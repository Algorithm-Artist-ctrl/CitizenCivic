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
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/ui/Button';

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

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
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

  const handlePreFill = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
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
            <Link
              to="/register"
              className="text-xs font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
            >
              Need an account? <span className="underline">Register</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand & Masthead */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-2xs border border-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Sign in to CitizenCivic
            </h1>
            <p className="text-xs text-slate-500">
              Authorized municipal officers, field operators, and registered residents
            </p>
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
                  Email Address
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
                    placeholder="officer@citizencivic.gov or citizen@gmail.com"
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
                    placeholder="Enter your password"
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
                  className="w-full py-2.5"
                >
                  Sign In &rarr;
                </Button>
              </div>
            </form>

            {/* Quick-fill Role Evaluator for Demo & Test Users */}
            <div className="pt-5 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span className="font-semibold text-slate-700">Quick Test Accounts:</span>
                <span>Click to auto-fill</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePreFill('citizen@citizencivic.org', 'testpass123')}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-800 block">Citizen User</span>
                  <span className="text-[10px] text-slate-500 font-mono">Report & track</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('operator@citizencivic.org', 'testpass123')}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-800 block">Field Operator</span>
                  <span className="text-[10px] text-slate-500 font-mono">Dispatch & resolve</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('moderator@citizencivic.org', 'testpass123')}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-800 block">Ward Verifier</span>
                  <span className="text-[10px] text-slate-500 font-mono">Review & verify</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('supervisor@citizencivic.org', 'testpass123')}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-800 block">Supervisor</span>
                  <span className="text-[10px] text-slate-500 font-mono">SLA & analytics</span>
                </button>
              </div>
            </div>
          </div>

          {/* Privacy footnote */}
          <div className="text-center text-[11px] text-slate-400">
            Protected by end-to-end token encryption and role-based session auditing.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        CitizenCivic Accountability Engine &copy; 2026 · Bengaluru Ward 82 Pilot
      </footer>
    </div>
  );
};

export default LoginPage;
