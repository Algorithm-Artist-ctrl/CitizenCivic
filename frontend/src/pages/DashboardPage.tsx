import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle,
  Clock,
  Flame,
  ArrowRight,
  MapPin,
  Award,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import type { Case, PaginatedResponse } from '../types';

interface AnalyticsData {
  total_cases: number;
  by_status: Record<string, number>;
  avg_ack_hours: number;
  avg_res_hours: number;
  verified_resolution_rate: number;
  hotspots_count: number;
  disputed_count: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [nearbyCases, setNearbyCases] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user/role cases
      const casesRes = await apiClient.get<PaginatedResponse<Case>>('/cases/');
      setRecentCases(casesRes.data.results.slice(0, 5));

      // 2. If citizen, fetch points and nearby issues
      if (user?.role === 'CITIZEN') {
        try {
          const [pointsRes, nearbyRes] = await Promise.all([
            apiClient.get('/rewards/my-points/'),
            apiClient.get('/cases/nearby/'),
          ]);
          setPoints(pointsRes.data.total_points || 0);
          setNearbyCases(nearbyRes.data.slice(0, 4));
        } catch (e) {
          console.error('Failed to load points/nearby', e);
        }
      }

      // 3. If supervisor/moderator/operator, fetch operational analytics
      if (['SUPERVISOR', 'MODERATOR', 'ADMIN', 'OPERATOR'].includes(user?.role || '')) {
        try {
          const analyticsRes = await apiClient.get<AnalyticsData>('/cases/analytics/');
          setAnalytics(analyticsRes.data);
        } catch (e) {
          console.error('Failed to load analytics', e);
        }
      }
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <span>{user?.role} Portal</span>
              <span>•</span>
              <span>Active Pilot: Ward 82</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashboard.welcome', { name: user?.display_name || 'Citizen' })}
            </h1>
            <p className="mt-2 text-sm text-emerald-100/90 max-w-2xl">
              CitizenCivic ensures your voice leads to real, independently verified resolution with transparent on-ground evidence.
            </p>
          </div>

          {user?.role === 'CITIZEN' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20">
                <Award className="h-6 w-6 text-yellow-300" />
                <div>
                  <div className="text-xs text-emerald-200 font-medium">Recognition Points</div>
                  <div className="text-xl font-bold text-white">{points} pts</div>
                </div>
              </div>

              <Link
                to="/report"
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
              >
                <PlusCircle className="h-5 w-5" />
                <span>{t('dashboard.citizen.quickReport', 'Report Issue')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SUPERVISOR / MODERATOR / OPERATOR METRICS DASHBOARD */}
      {analytics && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              <span>Operational Resolution Metrics</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Auto-aggregated from field transitions</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Total Cases</span>
              <div className="mt-1 text-2xl font-black text-slate-900">{analytics.total_cases}</div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-xs border border-amber-200 bg-amber-50/20">
              <span className="text-xs font-semibold text-amber-700">In Progress</span>
              <div className="mt-1 text-2xl font-black text-amber-700">
                {analytics.by_status?.IN_PROGRESS || 0}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-xs border border-yellow-200 bg-yellow-50/20">
              <span className="text-xs font-semibold text-yellow-800">Verification Pending</span>
              <div className="mt-1 text-2xl font-black text-yellow-800">
                {analytics.by_status?.VERIFICATION_PENDING || 0}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-xs border border-emerald-200 bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-700">Verified Resolved</span>
              <div className="mt-1 text-2xl font-black text-emerald-700">
                {analytics.by_status?.VERIFIED_RESOLVED || 0}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-xs border border-red-200 bg-red-50/20">
              <span className="text-xs font-semibold text-red-700">Disputed Closures</span>
              <div className="mt-1 text-2xl font-black text-red-700">{analytics.disputed_count}</div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-xs border border-purple-200 bg-purple-50/20">
              <span className="text-xs font-semibold text-purple-700">Resolution Rate</span>
              <div className="mt-1 text-2xl font-black text-purple-700">
                {analytics.verified_resolution_rate}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white p-5 shadow-xs border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Avg. Partner Acknowledgement
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics.avg_ack_hours} <span className="text-sm font-normal text-slate-500">hours</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Target SLA: 4.0 hours</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-xs border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Recurring Hotspots
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics.hotspots_count} <span className="text-sm font-normal text-slate-500">monitored spots</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Includes 7-day and 30-day follow-up checks</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Recent Cases & Nearby Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Cases (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              <span>{user?.role === 'CITIZEN' ? 'My Reported Cases' : 'Active Workload'}</span>
            </h2>
            <Link to="/cases" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
              <span>{t('common.viewAll', 'View All')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-800">No cases recorded yet</h3>
              <p className="mt-1 text-xs text-slate-500">
                {user?.role === 'CITIZEN'
                  ? 'Spot a garbage accumulation in your locality? Report it now for verified resolution.'
                  : 'No active cases currently require your attention.'}
              </p>
              {user?.role === 'CITIZEN' && (
                <Link
                  to="/report"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Report an Issue</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{c.case_number}</span>
                        {c.is_hotspot && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                            <Flame className="h-3 w-3" /> Hotspot
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2">{c.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{c.landmark || 'Indiranagar'}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <CaseStatusBadge status={c.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Nearby Public Issues or Hotspot Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <span>Nearby Public Issues</span>
            </h2>
            <span className="text-xs text-slate-500">Privacy-Safe</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <p className="text-xs text-slate-500">
              Anonymized issues currently open in your ward to avoid duplicate reports.
            </p>

            {nearbyCases.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No open issues nearby right now.</p>
            ) : (
              <div className="space-y-2.5 divide-y divide-slate-100">
                {nearbyCases.map((n) => (
                  <div key={n.id} className="pt-2.5 first:pt-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-semibold text-slate-700">{n.case_number}</span>
                      <CaseStatusBadge status={n.status} size="sm" />
                    </div>
                    <p className="mt-1 text-xs text-slate-600 font-medium">{n.category_name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{n.landmark}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
