import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Clock, ShieldAlert, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import Button from './ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle unverified official accounts attempting to access officer or admin workflows
  const isOfficialRole = ['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user.role);
  if (isOfficialRole && user.is_verified === false && allowedRoles && !allowedRoles.includes('CITIZEN')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-white p-8 shadow-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <Clock className="h-7 w-7 text-amber-600 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <ShieldAlert className="h-3.5 w-3.5" />
              Authorization Pending
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Municipal Verification In Progress
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account has been registered with role <span className="font-semibold text-slate-900 font-mono">{user.role}</span>, but official field authorization must be validated by an administrator before operations can be unlocked.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-left text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Official Handle:</span>
              <span className="font-semibold text-slate-800">{user.display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Registered Email:</span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">System Role:</span>
              <span className="font-semibold text-amber-700">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Status:</span>
              <span className="font-semibold text-amber-600">Pending Review</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check Authorization Status
            </Button>
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Public Portal
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle role mismatches
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (['OPERATOR', 'MODERATOR', 'SUPERVISOR'].includes(user.role)) {
      return <Navigate to="/officer" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
