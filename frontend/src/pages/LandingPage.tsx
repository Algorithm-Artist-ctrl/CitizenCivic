import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle,
  Search,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

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
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    setLoadingAnalytics(true);
    try {
      // 1. Fetch real analytics directly from PostgreSQL
      const analyticsRes = await apiClient.get<CaseAnalytics>('/cases/analytics').catch(() => null);
      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* LEFT COLUMN: Value Proposition, CTAs, Real Grounded Metrics */}
        <div className="lg:col-span-6 space-y-6">
          {/* Small rounded white badge with a green dot */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">{t('landing.eyebrow') || 'Independent Civic Accountability Initiative'}</span>
          </div>

          {/* Main Heading: Large Bold Typography (Navy line 1, Emerald Green line 2) */}
          <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-slate-950 leading-[1.08] font-heading">
            {isHindi ? (
              <>
                नागरिक समस्याएं दर्ज करें।<br />
                <span className="text-emerald-700">सत्यापित समाधान ट्रैक करें।</span>
              </>
            ) : (
              <>
                Report civic issues.<br />
                <span className="text-emerald-700">Track real resolution.</span>
              </>
            )}
          </h1>

          {/* Short bold supporting line */}
          <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {t('landing.heroSupporting') || 'Cleaner neighbourhoods. Safer streets. Better cities.'}
          </p>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
            {t('landing.heroSubtitle') || 'Report local civic problems, track progress in real time, and see verified outcomes — all in one place.'}
          </p>

          {/* Two Prominent Action Buttons matching Reference Image */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link
              to={user ? '/report' : '/login'}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-900 active:scale-98 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-emerald-200" />
              <span>{t('landing.reportCta') || 'Report an Issue'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/cases"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 active:scale-98 transition-all cursor-pointer"
            >
              <Search className="h-4 w-4 text-slate-600" />
              <span>{t('landing.exploreCta') || 'Explore Public Cases'}</span>
              <ArrowRight className="h-4 w-4 text-slate-600" />
            </Link>
          </div>

          {/* Three Compact Real-Data Statistic Cards matching Reference Image */}
          <div className="pt-3 border-t border-slate-200/80">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              {/* Card 1: Total Reports */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black font-tabular font-mono text-slate-950 leading-tight">
                      {loadingAnalytics ? '...' : (totalReportsCount ?? 0)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 truncate">
                      {t('landing.metrics.totalReports') || 'Total Reports'}
                    </div>
                  </div>
                </div>
                {/* Green Upward Sparkline */}
                <div className="w-10 sm:w-12 h-6 shrink-0 hidden xs:block">
                  <svg className="w-full h-full" viewBox="0 0 50 20" fill="none">
                    <path d="M2 16 L15 11 L25 14 L48 4" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card 2: In Progress */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black font-tabular font-mono text-amber-800 leading-tight">
                      {loadingAnalytics ? '...' : (inProgressCount ?? 0)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 truncate">
                      {t('landing.metrics.inProgress') || 'In Progress'}
                    </div>
                  </div>
                </div>
                {/* Amber Upward Sparkline */}
                <div className="w-10 sm:w-12 h-6 shrink-0 hidden xs:block">
                  <svg className="w-full h-full" viewBox="0 0 50 20" fill="none">
                    <path d="M2 16 L14 13 L26 15 L48 4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Verified Resolved */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black font-tabular font-mono text-emerald-800 leading-tight">
                      {loadingAnalytics ? '...' : (verifiedResolvedCount ?? 0)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 truncate">
                      {t('landing.metrics.verifiedResolved') || 'Verified Resolved'}
                    </div>
                  </div>
                </div>
                {/* Emerald Upward Sparkline */}
                <div className="w-10 sm:w-12 h-6 shrink-0 hidden xs:block">
                  <svg className="w-full h-full" viewBox="0 0 50 20" fill="none">
                    <path d="M2 15 L16 12 L28 13 L48 3" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Shield Icon + Slogan */}
            <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{t('landing.metrics.slogan') || 'Real reports. Real communities. Real change.'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Premium 3D Miniature Smart City Diorama matching Reference Image 2 */}
        <div className="lg:col-span-6 relative flex items-center justify-center select-none">
          <div className="relative w-full overflow-hidden rounded-2xl">
            <img
              src="/assets/landing-hero-city-2x.jpg"
              alt="CitizenCivic Floating 3D Smart City"
              className="w-full h-auto max-h-[480px] object-contain drop-shadow-xl pointer-events-none transform hover:scale-[1.01] transition-transform duration-700"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* 2. FOUR FEATURE CARDS DIRECTLY UNDERNEATH HERO matching Reference Image 2 */}
      <section className="pt-10 sm:pt-14 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feature 1: Report */}
          <Link
            to={user ? '/report' : '/login'}
            className="group rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-[#eefbf6] to-[#e4f7ee] p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 pr-2">
              <div className="h-13 w-11 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/icon-3d-report-trans.png"
                  alt="Report Civic Issue"
                  className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 font-heading">
                  {t('landing.features.report.title') || 'Report'}
                </h3>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                  {t('landing.features.report.description') || 'Click a photo, add location and submit a civic issue.'}
                </p>
              </div>
            </div>
            <span className="h-7 w-7 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          {/* Feature 2: Track */}
          <Link
            to="/cases"
            className="group rounded-2xl border border-blue-100/90 bg-gradient-to-r from-[#eff7ff] to-[#e6f2fd] p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 pr-2">
              <div className="h-13 w-11 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/icon-3d-track-trans.png"
                  alt="Track Civic Issue"
                  className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 font-heading">
                  {t('landing.features.track.title') || 'Track'}
                </h3>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                  {t('landing.features.track.description') || 'Follow the progress of your reported issue.'}
                </p>
              </div>
            </div>
            <span className="h-7 w-7 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          {/* Feature 3: See Impact */}
          <Link
            to="/cases?status=VERIFIED_RESOLVED"
            className="group rounded-2xl border border-amber-100/90 bg-gradient-to-r from-[#fef8ed] to-[#fbf0df] p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 pr-2">
              <div className="h-13 w-11 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/icon-3d-impact-trans.png"
                  alt="See Verified Impact"
                  className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 font-heading">
                  {t('landing.features.seeImpact.title') || 'See Impact'}
                </h3>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                  {t('landing.features.seeImpact.description') || 'View verified resolutions and community improvements.'}
                </p>
              </div>
            </div>
            <span className="h-7 w-7 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          {/* Feature 4: Earn Karma */}
          <Link
            to="/rewards"
            className="group rounded-2xl border border-purple-100/90 bg-gradient-to-r from-[#f9f5ff] to-[#f3ecfe] p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 pr-2">
              <div className="h-13 w-11 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/icon-3d-karma-trans.png"
                  alt="Earn Community Karma"
                  className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 font-heading">
                  {t('landing.features.earnKarma.title') || 'Earn Karma'}
                </h3>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                  {t('landing.features.earnKarma.description') || 'Contribute to a cleaner, stronger community.'}
                </p>
              </div>
            </div>
            <span className="h-7 w-7 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
