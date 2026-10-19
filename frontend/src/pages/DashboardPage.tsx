import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  Flame,
  ArrowRight,
  MapPin,
  Award,
  Activity,
  Layers,
  FileCheck,
  Wrench,
  ShieldCheck,
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
      const casesRes = await apiClient.get<PaginatedResponse<Case>>('/cases/').catch(() => ({ data: { results: [] } }));
      setRecentCases(casesRes.data.results ? casesRes.data.results.slice(0, 8) : []);

      // 2. If citizen, fetch points and nearby issues
      if (user?.role === 'CITIZEN') {
        try {
          const [pointsRes, nearbyRes] = await Promise.all([
            apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: 0 } })),
            apiClient.get('/cases/nearby/').catch(() => ({ data: [] })),
          ]);
          setPoints(pointsRes.data.total_points || 0);
          setNearbyCases(Array.isArray(nearbyRes.data) ? nearbyRes.data.slice(0, 5) : []);
        } catch (e) {
          console.error('Failed to load points/nearby', e);
        }
      }

      // 3. If supervisor/moderator/operator/admin, fetch operational analytics
      if (['SUPERVISOR', 'MODERATOR', 'ADMIN', 'OPERATOR'].includes(user?.role || '')) {
        try {
          const analyticsRes = await apiClient.get<AnalyticsData>('/cases/analytics/').catch(() => ({ data: null }));
          if (analyticsRes.data) {
            setAnalytics(analyticsRes.data);
          }
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  // Calculate quick metrics for Citizen
  const citizenResolvedCount = recentCases.filter((c) => c.status === 'VERIFIED_RESOLVED').length;
  const citizenPendingCount = recentCases.filter((c) => !['VERIFIED_RESOLVED', 'REJECTED'].includes(c.status)).length;

  // Filter queues for Operator and Moderator
  const operatorQueue = recentCases.filter((c) => ['FORWARDED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status));
  const verificationQueue = recentCases.filter((c) => ['RESOLUTION_REPORTED', 'VERIFICATION_PENDING', 'DISPUTED_CLOSURE'].includes(c.status));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Editorial Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
            <span className="font-bold text-slate-900">{user?.role} PORTAL</span>
            <span>·</span>
            <span>PILOT WARD 82 (INDIRANAGAR)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 mt-1">
            Welcome back, {user?.display_name || 'Officer'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {user?.role === 'CITIZEN' && 'Monitor your reported local blackspots and verify photographic evidence of municipal cleanups.'}
            {user?.role === 'OPERATOR' && 'Manage assigned field tickets, acknowledge SLA dispatches, and upload photographic resolution evidence.'}
            {user?.role === 'MODERATOR' && 'Audit on-ground photographic evidence, approve verified closures, and address citizen dispute claims.'}
            {user?.role === 'SUPERVISOR' && 'Oversee concessionaire SLA performance, resolution turnaround times, and monitored chronic hotspots.'}
            {user?.role === 'ADMIN' && 'Comprehensive jurisdiction oversight, operational compliance metrics, and immutable audit trails.'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'CITIZEN' && (
            <>
              <Link
                to="/rewards"
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Award className="h-4 w-4 text-amber-500" />
                <span>Karma: <strong className="font-mono text-slate-950">{points} pts</strong></span>
              </Link>

              <Link
                to="/report"
                className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
              >
                <PlusCircle className="h-4 w-4 text-emerald-400" />
                <span>Report an Issue</span>
              </Link>
            </>
          )}

          {['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && (
            <Link
              to="/cases"
              className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>All Cases Directory</span>
            </Link>
          )}
        </div>
      </div>

      {/* OPERATOR SPECIFIC ACTION QUEUE BANNER */}
      {user?.role === 'OPERATOR' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Active Field Dispatch Queue ({operatorQueue.length} Cases Pending Action)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-800 font-semibold">
              Target Field SLA: &lt; 4.0 hrs
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Cases assigned to your response team requiring acknowledgement, work in-progress status, or resolution photographic proof.
          </p>
        </div>
      )}

      {/* VERIFIER / MODERATOR SPECIFIC AUDIT QUEUE BANNER */}
      {['MODERATOR', 'SUPERVISOR'].includes(user?.role || '') && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Independent Verification Queue ({verificationQueue.length} Cases Requiring Ground Audit)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-teal-800 font-semibold">
              Mandatory Photographic Comparison
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Field operators have submitted resolution claims. Review before-and-after photographic evidence to approve verified closure or reopen for inadequate clearance.
          </p>
        </div>
      )}

      {/* OPERATIONAL KPI METRICS (FOR OFFICERS & ADMINS) */}
      {analytics && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">
                Operational Field Telemetry (Ward 82)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Aggregated via Field State Machine</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">Total Recorded</span>
              <div className="text-2xl font-black font-tabular text-slate-950 mt-1">{analytics.total_cases}</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 block">In Progress</span>
              <div className="text-2xl font-black font-tabular text-amber-800 mt-1">
                {analytics.by_status?.IN_PROGRESS || 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-700 block">Audit Pending</span>
              <div className="text-2xl font-black font-tabular text-teal-800 mt-1">
                {analytics.by_status?.VERIFICATION_PENDING || 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 block">Verified Closed</span>
              <div className="text-2xl font-black font-tabular text-emerald-800 mt-1">
                {analytics.by_status?.VERIFIED_RESOLVED || 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-700 block">Disputed Cases</span>
              <div className="text-2xl font-black font-tabular text-rose-800 mt-1">
                {analytics.disputed_count || 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-700 block">Resolution Rate</span>
              <div className="text-2xl font-black font-tabular text-purple-800 mt-1">
                {analytics.verified_resolution_rate}%
              </div>
            </div>
          </div>

          {/* Secondary SLA & Hotspot KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  Average Municipal Acknowledgement SLA
                </span>
                <div className="text-2xl font-bold font-tabular text-slate-950 mt-1">
                  {analytics.avg_ack_hours} <span className="text-sm font-normal text-slate-500">hours</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Target contract turnaround: 4.0 hours</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  Monitored Recurrence Hotspots
                </span>
                <div className="text-2xl font-bold font-tabular text-slate-950 mt-1">
                  {analytics.hotspots_count} <span className="text-sm font-normal text-slate-500">chronic spots</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Under active 7-day and 30-day automated inspection</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Flame className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CITIZEN PERSONAL STATS BAR */}
      {user?.role === 'CITIZEN' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Active Reports</span>
            <div className="text-2xl font-bold font-tabular text-slate-950 mt-1">{citizenPendingCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Under review or resolution</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700">Verified Resolved</span>
            <div className="text-2xl font-bold font-tabular text-emerald-800 mt-1">{citizenResolvedCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Confirmed clean on ground</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700">Karma Points</span>
            <div className="text-2xl font-bold font-tabular text-amber-800 mt-1">{points} pts</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Tier: Neighborhood Sentinel</p>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Cases Table / List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-700" />
              <span>
                {user?.role === 'CITIZEN' && 'My Active Civic Reports'}
                {user?.role === 'OPERATOR' && 'Assigned Action Queue'}
                {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && 'Active Workload Stream'}
              </span>
            </h2>
            <Link
              to="/cases"
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1"
            >
              <span>View all cases</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
              <Layers className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No active cases found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {user?.role === 'CITIZEN'
                  ? 'Notice an unaddressed garbage accumulation or overflowing bin? Report it for verified resolution.'
                  : 'There are no active cases assigned to your queue at this moment.'}
              </p>
              {user?.role === 'CITIZEN' && (
                <Link
                  to="/report"
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-400" />
                  <span>Report an Issue</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {recentCases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-950">
                        {c.case_number}
                      </span>
                      <CaseStatusBadge status={c.status} size="xs" />
                      {c.is_hotspot && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          <Flame className="h-2.5 w-2.5" />
                          <span>Hotspot</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-800 line-clamp-1">
                      {c.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{c.landmark || 'Indiranagar'}</span>
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      to={`/cases/${c.id}`}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors inline-flex items-center gap-1"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Nearby Issues Feed / Community Karma (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Nearby Issues Radar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span>Nearby Field Radar</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Radius: 1000m</span>
            </div>

            {nearbyCases.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
                No active neighbor reports detected in this grid radius.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                {nearbyCases.map((nb, i) => (
                  <div key={nb.id || i} className="p-3 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-900">
                        {nb.case_number}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {nb.distance_meters ? `${Math.round(nb.distance_meters)}m away` : 'Nearby'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 truncate">{nb.description}</p>
                    <p className="text-[10px] text-slate-400 truncate">{nb.landmark}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Card for Citizen */}
          {user?.role === 'CITIZEN' && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Verification Guidelines</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When an operator marks your issue as resolved, you have unilateral dispute authority. Inspect the on-ground photo proof before accepting.
              </p>
              <Link
                to="/rewards"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Learn about Karma points</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
