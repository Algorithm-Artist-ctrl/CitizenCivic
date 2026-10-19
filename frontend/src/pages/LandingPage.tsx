import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  ShieldCheck,
  ClipboardList,
  Clock,
  CheckCircle2,
  Camera,
  ArrowRight,
  Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import CivicStreetGridFallback from '../components/CivicStreetGridFallback';
import type { Case, PaginatedResponse } from '../types';

const CivicStreetGrid3D = lazy(() => import('../components/CivicStreetGrid3D'));

interface CaseAnalytics {
  total_cases: number;
  by_status: Record<string, number>;
  avg_ack_hours?: number;
  avg_res_hours?: number;
  verified_resolution_rate?: number;
}

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  // 100% Real Database State
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      // 1. Fetch real analytics directly from PostgreSQL
      const analyticsPromise = apiClient
        .get<CaseAnalytics>('/cases/analytics')
        .then((res) => {
          if (res.data) {
            setAnalytics(res.data);
          }
        })
        .catch((err) => {
          console.warn('Analytics endpoint unavailable:', err);
          setAnalyticsError('Database statistics unavailable');
        });

      // 2. Fetch real public cases for interactive references
      const casesPromise = apiClient
        .get<PaginatedResponse<Case>>('/cases/?page_size=6')
        .then((res) => {
          const list = res.data?.results || [];
          setCases(list);
          if (list.length > 0) {
            setSelectedCaseId(list[0].id);
          }
        })
        .catch((err) => {
          console.warn('Cases directory fetch error:', err);
        });

      await Promise.all([analyticsPromise, casesPromise]);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const isHindi = i18n.language === 'hi';

  // Real database metrics computed accurately
  const totalReportsCount = analytics?.total_cases ?? null;
  const inProgressCount = analytics?.by_status
    ? (analytics.by_status.IN_PROGRESS || 0) +
      (analytics.by_status.FORWARDED || 0) +
      (analytics.by_status.ACKNOWLEDGED || 0) +
      (analytics.by_status.SUBMITTED || 0)
    : null;
  const verifiedResolvedCount = analytics?.by_status?.VERIFIED_RESOLVED ?? null;

  return (
    <div className="flex-1 flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-7xl mx-auto w-full font-sans">
      {/* 1. HERO SECTION: Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: Value Proposition, CTAs, Real Grounded Metrics */}
        <div className="lg:col-span-6 space-y-6">
          {/* Small rounded white badge with a green dot */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="tracking-wide">{t('landing.eyebrow') || 'Independent Civic Accountability Initiative'}</span>
          </div>

          {/* Main Heading: Large Bold Typography (Navy line 1, Emerald Green line 2) */}
          <h1 className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[50px] font-extrabold tracking-tight text-slate-950 leading-[1.12] font-heading">
            {isHindi ? (
              <>
                नागरिक समस्याएं दर्ज करें।{' '}
                <span className="text-emerald-700 block sm:inline">सत्यापित समाधान ट्रैक करें।</span>
              </>
            ) : (
              <>
                Report civic issues.{' '}
                <span className="text-emerald-700 block sm:inline">Track real resolution.</span>
              </>
            )}
          </h1>

          {/* Short bold supporting line */}
          <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {t('landing.heroSupporting') || 'Cleaner neighbourhoods. Safer streets. Better cities.'}
          </p>

          {/* Description */}
          <p className="text-base sm:text-[18px] text-slate-600 leading-relaxed max-w-xl">
            {t('landing.heroSubtitle') || 'Report local civic problems, track progress in real time, and see verified outcomes — all in one place.'}
          </p>

          {/* Two Large CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link
              to={user ? '/report' : '/login'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-98 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 transition-all cursor-pointer"
            >
              <Plus className="h-5 w-5 text-emerald-200" />
              <span>{t('landing.reportCta') || 'Report an Issue'}</span>
            </Link>

            <Link
              to="/cases"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 active:scale-98 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
            >
              <Search className="h-5 w-5 text-slate-600" />
              <span>{t('landing.exploreCta') || 'Explore Public Cases'}</span>
            </Link>
          </div>

          {/* Three Compact Real-Data Statistic Cards */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              {/* Card 1: Total Reports */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-semibold truncate">
                    {t('landing.metrics.totalReports') || 'Total Reports'}
                  </span>
                  <ClipboardList className="h-4 w-4 text-slate-500 shrink-0" />
                </div>
                <div className="text-2xl font-black font-tabular font-mono text-slate-950">
                  {loadingAnalytics ? (
                    <span className="text-slate-300 text-lg">...</span>
                  ) : totalReportsCount !== null ? (
                    totalReportsCount
                  ) : (
                    <span className="text-xs text-slate-400 font-sans font-normal">0</span>
                  )}
                </div>
                {/* Subtle decorative trend line */}
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full w-4/5" />
                </div>
              </div>

              {/* Card 2: In Progress */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold truncate">
                    {t('landing.metrics.inProgress') || 'In Progress'}
                  </span>
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                </div>
                <div className="text-2xl font-black font-tabular font-mono text-amber-800">
                  {loadingAnalytics ? (
                    <span className="text-slate-300 text-lg">...</span>
                  ) : inProgressCount !== null ? (
                    inProgressCount
                  ) : (
                    <span className="text-xs text-slate-400 font-sans font-normal">0</span>
                  )}
                </div>
                {/* Subtle decorative trend line */}
                <div className="mt-2 h-1 w-full bg-amber-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-3/5" />
                </div>
              </div>

              {/* Card 3: Verified Resolved */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold truncate">
                    {t('landing.metrics.verifiedResolved') || 'Verified Resolved'}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-2xl font-black font-tabular font-mono text-emerald-800">
                  {loadingAnalytics ? (
                    <span className="text-slate-300 text-lg">...</span>
                  ) : verifiedResolvedCount !== null ? (
                    verifiedResolvedCount
                  ) : (
                    <span className="text-xs text-slate-400 font-sans font-normal">0</span>
                  )}
                </div>
                {/* Subtle decorative trend line */}
                <div className="mt-2 h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full w-5/6" />
                </div>
              </div>
            </div>

            {/* Shield Icon + Slogan */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{t('landing.metrics.slogan') || 'Real reports. Real communities. Real change.'}</span>
              </p>
              {analyticsError && (
                <span className="text-[11px] font-mono text-slate-400">
                  {analyticsError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Isometric Miniature City Scene with 3 Floating Cards */}
        <div className="lg:col-span-6">
          <Suspense fallback={<CivicStreetGridFallback className="h-[460px] w-full" />}>
            <CivicStreetGrid3D
              className="h-[460px] w-full"
              cases={cases}
              selectedCaseId={selectedCaseId}
              onSelectCase={(id) => setSelectedCaseId(id)}
            />
          </Suspense>
        </div>
      </div>

      {/* 2. FOUR FEATURE CARDS BELOW THE HERO (Equally Spaced) */}
      <section className="pt-10 sm:pt-14 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feature 1: Report */}
          <Link
            to={user ? '/report' : '/login'}
            className="group rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-5 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 mb-3 group-hover:scale-105 transition-transform">
                <Camera className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 font-heading">
                {t('landing.features.report.title') || 'Report'}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                {t('landing.features.report.description') || 'Click a photo, add location and submit a civic issue.'}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-emerald-800">
              <span>{t('nav.report') || 'Report issue'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 2: Track */}
          <Link
            to="/cases"
            className="group rounded-xl border border-sky-200/90 bg-sky-50/70 p-5 shadow-2xs hover:bg-sky-50 hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-800 mb-3 group-hover:scale-105 transition-transform">
                <Search className="h-5 w-5 text-sky-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 font-heading">
                {t('landing.features.track.title') || 'Track'}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                {t('landing.features.track.description') || 'Follow the progress of your reported issue.'}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-sky-800">
              <span>{t('landing.features.track.title') || 'Track'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 3: See Impact */}
          <Link
            to="/cases?status=VERIFIED_RESOLVED"
            className="group rounded-xl border border-amber-200/90 bg-amber-50/70 p-5 shadow-2xs hover:bg-amber-50 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-800 mb-3 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-amber-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 font-heading">
                {t('landing.features.seeImpact.title') || 'See Impact'}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                {t('landing.features.seeImpact.description') || 'View verified resolutions and community improvements.'}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-amber-800">
              <span>{t('landing.features.seeImpact.title') || 'See Impact'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 4: Earn Karma */}
          <Link
            to="/rewards"
            className="group rounded-xl border border-purple-200/90 bg-purple-50/70 p-5 shadow-2xs hover:bg-purple-50 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-100 text-purple-800 mb-3 group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5 text-purple-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 font-heading">
                {t('landing.features.earnKarma.title') || 'Earn Karma'}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                {t('landing.features.earnKarma.description') || 'Contribute to a cleaner, stronger community.'}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-purple-800">
              <span>{t('nav.karma') || 'Earn Karma'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
