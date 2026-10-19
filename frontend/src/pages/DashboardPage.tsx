import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Flame,
  MapPin,
  Award,
  Layers,
  FileCheck,
  Wrench,
  Compass,
  Navigation,
  FileText,
  ArrowRight,
  CheckCircle2,
  Folder,
  Landmark,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      const casesUrl = user?.role === 'CITIZEN' ? '/cases/?scope=mine&page_size=8' : '/cases/?page_size=8';
      const casesRes = await apiClient.get<PaginatedResponse<Case>>(casesUrl).catch(() => ({ data: { results: [] } }));
      const fetchedCases = casesRes.data?.results || [];
      setRecentCases(fetchedCases);

      // 2. Fetch personal karma points and nearby issues
      try {
        const [pointsRes, nearbyRes] = await Promise.all([
          apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: 0 } })),
          apiClient.get('/cases/nearby/').catch(() => ({ data: [] })),
        ]);
        if (pointsRes.data?.total_points !== undefined && pointsRes.data?.total_points !== null) {
          setPoints(pointsRes.data.total_points >= 0 ? pointsRes.data.total_points : 0);
        }
        if (Array.isArray(nearbyRes.data) && nearbyRes.data.length > 0) {
          setNearbyCases(nearbyRes.data.slice(0, 4));
        }
      } catch (e) {
        console.error('Failed to load points/nearby', e);
      }

      // 3. If supervisor/moderator/operator/admin, fetch real operational analytics
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

  // Metrics calculation
  const activeCasesCount = recentCases.filter((c) => !['VERIFIED_RESOLVED', 'REJECTED'].includes(c.status)).length;
  const verifiedResolvedCount = recentCases.filter((c) => c.status === 'VERIFIED_RESOLVED').length;

  // Filter queues for Operator and Moderator
  const operatorQueue = recentCases.filter((c) => ['FORWARDED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status));
  const verificationQueue = recentCases.filter((c) => ['RESOLUTION_REPORTED', 'VERIFICATION_PENDING', 'DISPUTED_CLOSURE'].includes(c.status));

  const displayNearby = nearbyCases;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* 3D City Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Banner Left Content */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PILOT WARD 82 (INDIRANAGAR)</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 font-heading">
                Welcome back, {user?.display_name || user?.email?.split('@')[0] || t('dashboard.officer', 'Citizen')} 👋
              </h1>
              <p className="text-sm font-medium text-slate-600 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-700 font-semibold">Cleaner Neighbourhoods</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700">Safer Streets</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700">Better Cities</span>
              </p>
            </div>

            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Track real-time field progress on reported civic issues, inspect photo-verified resolutions by municipal response teams, and earn community karma.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Report an Issue →</span>
              </Link>

              <Link
                to="/cases"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 transition-all"
              >
                <Compass className="h-4 w-4 text-slate-500" />
                <span>View Public Cases</span>
              </Link>
            </div>
          </div>

          {/* Banner Right 3D Scene */}
          <div className="lg:col-span-5 relative h-56 sm:h-64 lg:h-full min-h-[220px] overflow-hidden bg-gradient-to-r from-white via-transparent to-transparent">
            <img
              src="/assets/dashboard-hero.jpg"
              alt="CitizenCivic Smart City"
              className="absolute inset-0 h-full w-full object-cover object-right lg:object-center transform hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent lg:hidden" />
          </div>
        </div>
      </div>

      {/* Operator or Moderator Queues (if applicable) */}
      {user?.role === 'OPERATOR' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Active Field Dispatch Queue ({operatorQueue.length} Pending)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-800 font-semibold">
              Target Field SLA: &lt; 4.0 hrs
            </span>
          </div>
        </div>
      )}

      {['MODERATOR', 'SUPERVISOR'].includes(user?.role || '') && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Independent Verification Queue ({verificationQueue.length} Requiring Audit)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-teal-800 font-semibold">
              Mandatory Photographic Comparison
            </span>
          </div>
        </div>
      )}

      {/* Operational Telemetry if Officer */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Total Recorded</span>
            <div className="text-2xl font-black font-tabular text-slate-950 mt-1">{analytics.total_cases}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 block">In Progress</span>
            <div className="text-2xl font-black font-tabular text-amber-800 mt-1">{analytics.by_status?.IN_PROGRESS || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 block">Audit Pending</span>
            <div className="text-2xl font-black font-tabular text-teal-800 mt-1">{analytics.by_status?.VERIFICATION_PENDING || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 block">Verified Closed</span>
            <div className="text-2xl font-black font-tabular text-emerald-800 mt-1">{analytics.by_status?.VERIFIED_RESOLVED || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-700 block">Disputed</span>
            <div className="text-2xl font-black font-tabular text-rose-800 mt-1">{analytics.disputed_count || 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 block">Resolution Rate</span>
            <div className="text-2xl font-black font-tabular text-slate-900 mt-1">
              {(analytics.verified_resolution_rate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 4 KPI Stat Cards with SVG Sparklines matching mockups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Reports */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <Link
              to="/cases?scope=mine"
              className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-slate-950 font-mono tracking-tight">
                {activeCasesCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                ACTIVE REPORTS
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Under review or resolution
              </p>
            </div>

            <div className="w-20 h-8">
              <svg className="w-full h-full" viewBox="0 0 100 40" fill="none">
                <path d="M0 32 Q 25 15, 50 24 T 100 8" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Verified Resolved */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Link
              to="/cases"
              className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                {verifiedResolvedCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                VERIFIED RESOLVED
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Confirmed clean on ground
              </p>
            </div>

            <div className="w-20 h-8">
              <svg className="w-full h-full" viewBox="0 0 100 40" fill="none">
                <path d="M0 35 Q 20 28, 45 18 T 100 6" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Karma Points */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-amber-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <Link
              to="/rewards"
              className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-amber-700 font-mono tracking-tight">
                {points} <span className="text-xs font-sans font-bold text-amber-600">pts</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                KARMA POINTS
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Tier: Neighborhood Sentinel
              </p>
            </div>

            <div className="w-20 h-8">
              <svg className="w-full h-full" viewBox="0 0 100 40" fill="none">
                <path d="M0 30 Q 30 35, 60 14 T 100 4" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: 3D Earth Globe Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="text-xs font-extrabold text-slate-900 leading-tight">
              People<br />Report<br />Cities<br /><span className="text-emerald-700">Improve</span>
            </div>
          </div>
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl flex items-center justify-center">
            <img
              src="/assets/earth-card.jpg"
              alt="People Report Cities Improve"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): My Active Civic Reports */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-950 font-heading">
                My Active Civic Reports
              </h2>
            </div>
            <Link
              to="/cases?scope=mine"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>View All Reports →</span>
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
              <Layers className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No active reports yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Notice an unaddressed garbage accumulation or overflowing bin? Report it for verified resolution.
              </p>
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Report an Issue</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map((c) => {
                const categoryName = c.category?.name_en || 'Civic Issue';
                const thumbImage =
                  c.evidence && c.evidence.length > 0 && c.evidence[0].file
                    ? c.evidence[0].file
                    : '/assets/cat-garbage.jpg';

                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Thumbnail */}
                      <div className="h-14 w-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <img
                          src={thumbImage}
                          alt={categoryName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/cat-garbage.jpg';
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-950">
                            {c.case_number}
                          </span>
                          <CaseStatusBadge status={c.status} size="xs" />
                          {c.is_hotspot && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md font-bold">
                              <Flame className="h-2.5 w-2.5" />
                              <span>HOTSPOT</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-900 line-clamp-1">
                          {c.description || categoryName}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            <span>{c.landmark || 'Indiranagar, Ward 82'}</span>
                          </span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">
                            {c.latitude ? `${c.latitude.toFixed(4)}° N, ${c.longitude.toFixed(4)}° E` : '12.9716° N, 77.6412° E'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                      >
                        <span>Review Details →</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Quick Actions + Nearby Field Radar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions (4 cards in 2x2 grid) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/report"
                className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-300 transition-all text-center"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Report Issue</span>
              </Link>

              <Link
                to="/cases"
                className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-300 transition-all text-center"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2">
                  <Folder className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Public Cases</span>
              </Link>

              <Link
                to="/rewards"
                className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-300 transition-all text-center"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Community Karma</span>
              </Link>

              <Link
                to="/municipal"
                className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/70 hover:border-rose-300 transition-all text-center"
              >
                <div className="h-9 w-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-2">
                  <Landmark className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Municipal Data</span>
              </Link>
            </div>
          </div>

          {/* Nearby Field Radar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Nearby Field Radar
                </h3>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Radius: 1000m
              </span>
            </div>

            {/* Radar Graphic Map */}
            <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
              <img
                src="/assets/radar-map.jpg"
                alt="Field Radar Map"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-radial from-transparent to-slate-950/60 pointer-events-none" />

              {/* Pulsing Concentric Radar Rings */}
              <div className="absolute h-28 w-28 rounded-full border border-emerald-400/40 animate-ping pointer-events-none" />
              <div className="absolute h-20 w-20 rounded-full border border-emerald-400/60 pointer-events-none" />
              <div className="absolute h-3 w-3 rounded-full bg-emerald-400 shadow-md pointer-events-none" />
            </div>

            {/* Radar Active Markers List */}
            {displayNearby.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No active incidents reported within radar range.
              </div>
            ) : (
              <div className="space-y-2.5 divide-y divide-slate-100 text-xs">
                {displayNearby.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.color || 'bg-emerald-500'}`} />
                      <span className="font-semibold text-slate-800 truncate">
                        {item.title || item.landmark || `Case #${item.case_number || idx + 1}`}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
                      {item.distance || '450m'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/cases"
              className="block w-full text-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 transition-colors"
            >
              Explore Full Ward Radar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
