import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Search,
  RefreshCw,
  Award,
  Landmark,
  Clock,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import type { UserRole } from '../types';

interface AdminUserItem {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  date_joined: string;
  last_login?: string | null;
}

interface AdminUsersResponse {
  total_users: number;
  role_counts: Record<string, number>;
  users: AdminUserItem[];
}

export const AdminPortalPage: React.FC = () => {
  const { user } = useAuth();

  const [userData, setUserData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsersRoster = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    setErrorMsg(null);
    try {
      const res = await apiClient.get<AdminUsersResponse>('/auth/admin/users');
      setUserData(res.data);
    } catch (err: any) {
      console.error('Failed to load admin user roster', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to retrieve administrative users roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsersRoster();
  }, []);

  const roleCounts = userData?.role_counts || {};
  const usersList = userData?.users || [];

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUPERVISOR':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'MODERATOR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OPERATOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CITIZEN':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Admin Masthead */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-0.5 text-xs font-semibold text-purple-800">
                <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
                Administrative Console
              </span>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase text-white">
                {user?.role || 'ADMIN'}
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                System Healthy
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Platform Governance & User Roster
            </h1>
            <p className="text-xs text-slate-500">
              Manage access control, verify authorised municipal personnel, and oversee system operations across configured service areas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/officer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Officer Work Queue</span>
            </Link>
            <Link
              to="/rewards"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Award className="h-3.5 w-3.5 text-amber-600" />
              <span>Leaderboards</span>
            </Link>
            <Link
              to="/municipal"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Landmark className="h-3.5 w-3.5 text-indigo-600" />
              <span>Municipal Finance</span>
            </Link>
          </div>
        </div>

        {/* User Role Statistics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{userData?.total_users || 0}</div>
          </div>
          <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80">
            <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Citizens</div>
            <div className="mt-1 text-2xl font-bold text-emerald-950">{roleCounts['CITIZEN'] || 0}</div>
          </div>
          <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200/80">
            <div className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider">Operators</div>
            <div className="mt-1 text-2xl font-bold text-blue-950">{roleCounts['OPERATOR'] || 0}</div>
          </div>
          <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/80">
            <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Moderators</div>
            <div className="mt-1 text-2xl font-bold text-amber-950">{roleCounts['MODERATOR'] || 0}</div>
          </div>
          <div className="rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-200/80">
            <div className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider">Supervisors</div>
            <div className="mt-1 text-2xl font-bold text-indigo-950">{roleCounts['SUPERVISOR'] || 0}</div>
          </div>
          <div className="rounded-xl bg-purple-50/70 p-3.5 border border-purple-200/80">
            <div className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider">Admins</div>
            <div className="mt-1 text-2xl font-bold text-purple-950">{roleCounts['ADMIN'] || 0}</div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-900 border border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* User Roster Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Role Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'CITIZEN', 'OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  roleFilter === r
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchUsersRoster(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex min-h-[35vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">User & Handle</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No users match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="font-semibold text-slate-950">{u.display_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Pending Authorization
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="text-emerald-700 font-semibold">Active</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Suspended</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Administrative Policy & Security Advisory */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Database className="h-4 w-4 text-purple-600" />
          <span>Municipal Access Control & Anti-Tamper Enforcement</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Public self-registration strictly assigns the <span className="font-mono font-semibold text-slate-800">CITIZEN</span> role with hashed password storage (PBKDF2-SHA256). Municipal Officer accounts (<span className="font-mono text-slate-800">OPERATOR, MODERATOR, SUPERVISOR, ADMIN</span>) require cryptographic verification by platform administrators before field queues and status transition endpoints accept their tokens.
        </p>
      </div>
    </div>
  );
};

export default AdminPortalPage;
