import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  ShieldCheck,
  Clock,
  Filter,
  Leaf,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface LeaderboardCitizen {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  verified_reports: number;
  karma_tier: string | null;
}

interface LeaderboardOfficer {
  rank: number;
  user_id: string;
  display_name: string;
  role: string;
  assigned_cases: number;
  verified_resolved: number;
  active_workload: number;
  disputed_cases: number;
  resolution_rate_pct: number;
  avg_resolution_hours: number;
}

interface ServiceAreaItem {
  id: string;
  name: string;
  name_hi: string;
}

interface LedgerEntry {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

export const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<'citizen' | 'officer'>(
    tabParam === 'officer' ? 'officer' : 'citizen'
  );

  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'REPORTS' | 'AUDITS'>('ALL');

  useEffect(() => {
    if (tabParam === 'officer' || tabParam === 'citizen') {
      setTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: 'citizen' | 'officer') => {
    setTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  };

  const [serviceAreas, setServiceAreas] = useState<ServiceAreaItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  const [citizenList, setCitizenList] = useState<LeaderboardCitizen[]>([]);
  const [officerList, setOfficerList] = useState<LeaderboardOfficer[]>([]);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Load initial metadata: service areas + personal score
  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const [areasRes, myPointsRes] = await Promise.all([
          apiClient.get('/areas/service-areas/').catch(() => ({ data: { results: [] } })),
          user
            ? apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: null, history: [] } }))
            : Promise.resolve({ data: { total_points: null, history: [] } }),
        ]);

        const areas = areasRes.data.results || areasRes.data || [];
        setServiceAreas(areas);

        const mpData: any = myPointsRes.data;
        if (mpData) {
          if (mpData.total_points !== undefined && mpData.total_points !== null) {
            setTotalPoints(mpData.total_points >= 0 ? mpData.total_points : 0);
          }
          const entries = Array.isArray(mpData.history)
            ? mpData.history
            : (Array.isArray(mpData.recent_entries) ? mpData.recent_entries : []);
          setRecentEntries(entries);
        }
      } catch (err) {
        console.error('Error initializing rewards page:', err);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [user]);

  // Load leaderboard whenever tab or selected area changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('type', tab);
        if (selectedAreaId) {
          params.append('area_id', selectedAreaId);
        }

        const res = await apiClient.get(`/rewards/leaderboard?${params.toString()}`);
        const data = res.data;

        if (tab === 'officer') {
          const list: LeaderboardOfficer[] = Array.isArray(data.leaderboard) ? data.leaderboard : [];
          setOfficerList(list);
        } else {
          const list: LeaderboardCitizen[] = Array.isArray(data.leaderboard) ? data.leaderboard : (Array.isArray(data) ? data : []);
          setCitizenList(list);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [tab, selectedAreaId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* 3D Celebration Hero Banner */}
      {/* 3D Karma Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs min-h-[220px] sm:min-h-[240px] flex flex-col justify-center">
        {/* Banner Right 3D Scene */}
        <div className="lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[50%] h-full flex items-center justify-end select-none pointer-events-none overflow-hidden z-0">
          <img
            src="/assets/karma-hero.png"
            alt="Community Karma Celebration"
            className="h-full w-full object-cover object-left lg:object-contain lg:object-right drop-shadow-sm"
            loading="eager"
          />
        </div>

        {/* Banner Left Content */}
        <div className="relative z-10 p-5 sm:p-7 lg:p-9 max-w-xl lg:max-w-[52%] space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50/90 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-800 backdrop-blur-xs">
            <span>🏆 {t('rewards.heroTag', 'CIVIC RECOGNITION & KARMA LEDGER')}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 font-heading leading-tight">
              {t('rewards.heroTitle', 'Community Karma & Recognition')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              {t('rewards.heroSubtitle', 'Auditable points credited for verified reporting, photographic accuracy, and on-ground audits.')}
            </p>
          </div>

          {/* 3 Reference Feature Highlight Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/90 px-3.5 py-1.5 shadow-2xs backdrop-blur-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Leaf className="h-4 w-4" />
              </div>
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-900 block">{t('rewards.feature1Title', 'Cleaner Neighbourhoods')}</span>
                <span className="text-slate-500 text-[10px]">{t('rewards.feature1Sub', 'Real Civic Impact')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/90 px-3.5 py-1.5 shadow-2xs backdrop-blur-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-900 block">{t('rewards.feature2Title', 'Verified Actions')}</span>
                <span className="text-slate-500 text-[10px]">{t('rewards.feature2Sub', 'Trusted by Community')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/90 px-3.5 py-1.5 shadow-2xs backdrop-blur-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-900 block">{t('rewards.feature3Title', 'Recognized Contributors')}</span>
                <span className="text-slate-500 text-[10px]">{t('rewards.feature3Sub', 'Build a Better City')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger-backed karma total; no unconfigured tiers or reward promises. */}
      <section className="max-w-2xl rounded-2xl border border-slate-200/90 bg-[#073033] p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
              {t('rewards.totalPointsTitle', 'Your Karma Points')}
            </span>
            <div className="flex items-baseline gap-2 text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
              <span>{totalPoints ?? '—'}</span>
              <span className="text-base font-sans font-bold text-emerald-300">pts</span>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-emerald-100/80">
              {t('rewards.ledgerDescription', 'This total reflects points recorded in your reward ledger. Reward rules are shown only when configured by the platform.')}
            </p>
          </div>
          <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden flex items-center justify-center">
            <img src="/assets/karma-medal.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Reward History Vertical Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-950 font-heading">
                {t('rewards.historyTitle')}
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'ALL'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('rewards.allTransactions')}
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('REPORTS')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'REPORTS'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('rewards.reports')}
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('AUDITS')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'AUDITS'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('rewards.audits')}
              </button>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            {recentEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('rewards.noHistory')}
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {recentEntries
                  .filter((item) => {
                    if (historyFilter === 'ALL') return true;
                    if (historyFilter === 'REPORTS') {
                      return (item.reason || '').toLowerCase().includes('report') || (item.reason || '').toLowerCase().includes('submit');
                    }
                    if (historyFilter === 'AUDITS') {
                      return (item.reason || '').toLowerCase().includes('audit') || (item.reason || '').toLowerCase().includes('verif');
                    }
                    return true;
                  })
                  .map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      {/* Circle Node */}
                      <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs ring-2 ring-emerald-100" />

                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {item.reason}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg shrink-0">
                          +{item.points} Pts
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Top Civic Contributors / Leaderboard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-950 font-heading">
                {t('rewards.leaderboardTitle')}
              </h2>
            </div>

            {/* Area Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="">{t('rewards.allAreas')}</option>
                {serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {i18n.language === 'hi' ? sa.name_hi : sa.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segmented Switch: Citizen vs Officer */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTabChange('citizen')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                tab === 'citizen'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {t('rewards.tabCitizen')}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('officer')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                tab === 'officer'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {t('rewards.tabOfficer')}
            </button>
          </div>

          {/* Ranked List */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            {leaderboardLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : tab === 'citizen' ? (
              citizenList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t('rewards.noLeaderboard')}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-2">
                  {citizenList.map((cit, idx) => {
                    const isCurrent = user && cit.user_id === user.id;
                    const rankIcons = ['🥇', '🥈', '🥉'];
                    const rankBadge = idx < 3 ? rankIcons[idx] : `#${cit.rank || idx + 1}`;

                    return (
                      <div
                        key={cit.user_id || idx}
                        className={`pt-2.5 first:pt-0 flex items-center justify-between p-2 rounded-xl transition-colors ${
                          isCurrent ? 'bg-emerald-50/70 border border-emerald-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold w-6 text-center text-slate-700">
                            {rankBadge}
                          </span>

                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {cit.display_name ? cit.display_name.charAt(0).toUpperCase() : 'C'}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {cit.display_name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-mono uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {cit.karma_tier ? `${cit.karma_tier} · ` : ''}{cit.verified_reports} verified
                            </p>
                          </div>
                        </div>

                        <div className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                          {cit.total_points} Pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Officer Performance Leaderboard */
              officerList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t('rewards.noOfficerLeaderboard')}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-2">
                  {officerList.map((off, idx) => {
                    const rankIcons = ['🥇', '🥈', '🥉'];
                    const rankBadge = idx < 3 ? rankIcons[idx] : `#${off.rank || idx + 1}`;

                    return (
                      <div
                        key={off.user_id || idx}
                        className="pt-2.5 first:pt-0 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold w-6 text-center text-slate-700">
                            {rankBadge}
                          </span>

                          <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                            {off.display_name ? off.display_name.charAt(0).toUpperCase() : 'O'}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900">
                              {off.display_name}
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {off.role} · {off.verified_resolved}/{off.assigned_cases} resolved ({off.resolution_rate_pct}%)
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-emerald-700 block">
                            {off.avg_resolution_hours}h avg
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {off.active_workload} active
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
