import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CaseStatusBadge from '../components/CaseStatusBadge';
import type { Case, PaginatedResponse } from '../types';

interface CaseAnalytics {
  total_cases: number;
  by_status: Record<string, number>;
  avg_ack_hours?: number;
  avg_res_hours?: number;
  verified_resolution_rate?: number;
}

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // 100% Real Database State
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    setLoadingCases(true);
    setLoadingAnalytics(true);
    setLoadError(null);

    try {
      // 1. Fetch real public cases from PostgreSQL database
      const casesPromise = apiClient
        .get<PaginatedResponse<Case>>('/cases/?page_size=5')
        .then((res) => {
          const list = res.data?.results || [];
          setCases(list);
          if (list.length > 0) {
            setSelectedCaseId(list[0].id);
          }
        })
        .catch((err) => {
          console.warn('Failed to load public cases:', err);
          setLoadError('Unable to connect to municipal case database.');
        });

      // 2. Fetch real analytics from database
      const analyticsPromise = apiClient
        .get<CaseAnalytics>('/cases/analytics')
        .then((res) => {
          if (res.data) {
            setAnalytics(res.data);
          }
        })
        .catch((err) => {
          console.warn('Failed to load case analytics:', err);
        });

      await Promise.all([casesPromise, analyticsPromise]);
    } finally {
      setLoadingCases(false);
      setLoadingAnalytics(false);
    }
  };

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  // Helper for workflow milestone status
  const getWorkflowStep = (status?: string) => {
    switch (status) {
      case 'DRAFT':
        return 0;
      case 'SUBMITTED':
      case 'REVIEWED':
        return 1;
      case 'FORWARDED':
      case 'ACKNOWLEDGED':
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLUTION_REPORTED':
      case 'VERIFICATION_PENDING':
      case 'DISPUTED_CLOSURE':
        return 3;
      case 'VERIFIED_RESOLVED':
        return 4;
      default:
        return 1;
    }
  };

  const activeStep = activeCase ? getWorkflowStep(activeCase.status) : 1;

  return (
    <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: Value Proposition, CTAs, Real Grounded Metrics */}
        <div className="lg:col-span-6 space-y-6">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span className="tracking-wide">Bengaluru Municipal Sector Pilot</span>
          </div>

          {/* Main Headline (44–54px scale) */}
          <h1 className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[50px] font-extrabold tracking-tight text-slate-950 leading-[1.12]">
            Report civic issues.{' '}
            <span className="text-emerald-700 block sm:inline">Track real resolution.</span>
          </h1>

          {/* Supporting Paragraph (18–20px scale) */}
          <p className="text-lg sm:text-[19px] text-slate-600 leading-relaxed max-w-xl">
            Report neighbourhood problems, follow progress, and review real resolution evidence — all in one place.
          </p>

          {/* Primary Action Buttons (16–18px scale) */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link to={user ? '/report' : '/login'}>
              <Button
                variant="primary"
                size="lg"
                className="text-base sm:text-[17px] font-semibold px-6 py-3.5 shadow-sm"
                icon={<Camera className="h-5 w-5 text-emerald-400" />}
              >
                Report an Issue
              </Button>
            </Link>

            <Link to="/cases">
              <Button
                variant="secondary"
                size="lg"
                className="text-base sm:text-[17px] font-semibold px-6 py-3.5"
                icon={<ArrowRight className="h-5 w-5" />}
              >
                Explore Public Cases
              </Button>
            </Link>
          </div>

          {/* Real Metrics Grounded in Database Records */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-6 max-w-md">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 block">
                  Total Cases
                </span>
                <div className="text-2xl font-black font-tabular font-mono text-slate-950 mt-1">
                  {loadingAnalytics ? (
                    <span className="text-slate-300">...</span>
                  ) : analytics ? (
                    analytics.total_cases
                  ) : (
                    cases.length
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-amber-700 block">
                  In Progress
                </span>
                <div className="text-2xl font-black font-tabular font-mono text-amber-800 mt-1">
                  {loadingAnalytics ? (
                    <span className="text-slate-300">...</span>
                  ) : analytics ? (
                    (analytics.by_status?.IN_PROGRESS || 0) +
                    (analytics.by_status?.FORWARDED || 0) +
                    (analytics.by_status?.ACKNOWLEDGED || 0)
                  ) : (
                    0
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 block">
                  Verified Closed
                </span>
                <div className="text-2xl font-black font-tabular font-mono text-emerald-800 mt-1">
                  {loadingAnalytics ? (
                    <span className="text-slate-300">...</span>
                  ) : analytics ? (
                    analytics.by_status?.VERIFIED_RESOLVED || 0
                  ) : (
                    0
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Calculated directly from live municipal database records</span>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Elegant Compact Product Interface */}
        <div className="lg:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header & Case Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase font-bold text-slate-800">
                  Live Case Record
                </span>
                <Badge variant="emerald" size="xs">
                  Neon DB
                </Badge>
              </div>

              {/* Real Case Selector Pills if multiple cases exist */}
              {cases.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {cases.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        c.id === (activeCase?.id || '')
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                      title={c.case_number}
                    >
                      {c.case_number.split('-').slice(-1)[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="p-5">
              {loadingCases ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mx-auto" />
                  <p className="text-xs text-slate-500 font-mono">
                    Connecting to live PostgreSQL records...
                  </p>
                </div>
              ) : loadError ? (
                <div className="py-12 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">Database Connection Notice</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">{loadError}</p>
                  <Button variant="secondary" size="sm" onClick={fetchRealData} icon={<RotateCw className="h-3.5 w-3.5" />}>
                    Retry Connection
                  </Button>
                </div>
              ) : activeCase ? (
                <div className="space-y-4">
                  {/* Case Identifiers */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-slate-950">
                          {activeCase.case_number}
                        </span>
                        <CaseStatusBadge status={activeCase.status} size="xs" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                        {activeCase.category?.name_en || 'Municipal Issue'}
                      </p>
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-500">
                      {new Date(activeCase.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Real Description */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Citizen Issue Report
                    </span>
                    <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed line-clamp-3">
                      {activeCase.description}
                    </p>
                  </div>

                  {/* Real Location & Coordinates */}
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs text-slate-700 font-sans">
                    <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span className="truncate font-medium">{activeCase.landmark}</span>
                    {activeCase.latitude && activeCase.longitude && (
                      <span className="ml-auto font-mono text-[11px] text-slate-400 shrink-0">
                        {activeCase.latitude.toFixed(4)}, {activeCase.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>

                  {/* 4-Step Resolution Progress Indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Verification Pipeline</span>
                      <span>
                        {activeStep === 4 ? 'Resolved & Verified' : `Milestone 0${activeStep} of 04`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <div className={`h-1.5 rounded-full ${activeStep >= 1 ? 'bg-emerald-600' : 'bg-slate-200'}`} title="1. Submitted" />
                      <div className={`h-1.5 rounded-full ${activeStep >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`} title="2. Dispatched" />
                      <div className={`h-1.5 rounded-full ${activeStep >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`} title="3. Resolution Evidence" />
                      <div className={`h-1.5 rounded-full ${activeStep >= 4 ? 'bg-emerald-600' : 'bg-slate-200'}`} title="4. Verified Closed" />
                    </div>

                    <div className="grid grid-cols-4 text-[10px] text-slate-500 font-mono pt-0.5">
                      <span className={activeStep >= 1 ? 'text-slate-900 font-semibold' : ''}>Report</span>
                      <span className={activeStep >= 2 ? 'text-slate-900 font-semibold' : ''}>Dispatch</span>
                      <span className={activeStep >= 3 ? 'text-slate-900 font-semibold' : ''}>Evidence</span>
                      <span className={activeStep >= 4 ? 'text-emerald-700 font-bold' : ''}>Verified</span>
                    </div>
                  </div>

                  {/* View Complete Audit Trail Action Link */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      to={`/cases/${activeCase.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
                    >
                      <span>Explore Case Timeline & Evidence</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      to="/cases"
                      className="text-[11px] font-mono text-slate-500 hover:text-slate-800"
                    >
                      Directory ({cases.length} loaded) &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                /* Genuine Empty State */
                <div className="py-12 text-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    No active civic cases in this jurisdiction yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All reports are backed by on-ground photographic evidence. Be the first to file a verified report in your ward.
                  </p>
                  <Link to={user ? '/report' : '/login'}>
                    <Button variant="primary" size="sm" icon={<Camera className="h-3.5 w-3.5 text-emerald-400" />}>
                      File the First Report
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
