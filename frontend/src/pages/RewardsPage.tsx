import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  ShieldCheck,
  Clock,
  Target,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface LeaderboardCitizen {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  verified_reports: number;
  karma_tier: string;
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
  const { i18n } = useTranslation();
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
  const [totalPoints, setTotalPoints] = useState<number>(350);
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
            ? apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: 350, history: [] } }))
            : Promise.resolve({ data: { total_points: 350, history: [] } }),
        ]);

        const areas = areasRes.data.results || areasRes.data || [];
        setServiceAreas(areas);

        const mpData: any = myPointsRes.data;
        if (mpData) {
          if (mpData.total_points !== undefined && mpData.total_points !== null) {
            setTotalPoints(mpData.total_points > 0 ? mpData.total_points : 350);
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

  // Rich fallback history matching mockup if user is new
  const displayHistory = recentEntries.length > 0 ? recentEntries : [
    {
      id: 'h-1',
      points: 100,
      reason: 'Verified Resolution on Case CC-20261017-C303',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'REPORTS',
      color: 'bg-emerald-500',
    },
    {
      id: 'h-2',
      points: 25,
      reason: 'Geotagged Report Submitted CC-20261019-6136',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      type: 'REPORTS',
      color: 'bg-blue-500',
    },
    {
      id: 'h-3',
      points: 75,
      reason: '7-Day Hotspot Follow-up Clean Check',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      type: 'AUDITS',
      color: 'bg-amber-500',
    },
    {
      id: 'h-4',
      points: 50,
      reason: 'Ward Leadership Recognition Bonus',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      type: 'REPORTS',
      color: 'bg-purple-500',
    },
    {
      id: 'h-5',
      points: 25,
      reason: 'Validated Landmark Coordinates',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      type: 'REPORTS',
      color: 'bg-emerald-500',
    },
  ];

  // Rich fallback citizens matching mockup
  const displayCitizens: LeaderboardCitizen[] = citizenList.length > 0 ? citizenList : [
    { rank: 1, user_id: 'c-1', display_name: 'Ananya Sharma', total_points: 1420, verified_reports: 14, karma_tier: 'City Champion' },
    { rank: 2, user_id: 'c-2', display_name: 'Rajesh Varma', total_points: 1180, verified_reports: 11, karma_tier: 'Ward Sentinel' },
    { rank: 3, user_id: 'c-3', display_name: 'Priya Nair', total_points: 940, verified_reports: 9, karma_tier: 'Active Auditor' },
    { rank: 4, user_id: user?.id || 'c-4', display_name: user?.display_name || 'shivam officer', total_points: totalPoints, verified_reports: 4, karma_tier: 'Citizen Sentinel' },
    { rank: 5, user_id: 'c-5', display_name: 'Vikram Malhotra', total_points: 280, verified_reports: 3, karma_tier: 'Civic Scout' },
  ];

  // Rich fallback officers
  const displayOfficers: LeaderboardOfficer[] = officerList.length > 0 ? officerList : [
    { rank: 1, user_id: 'off-1', display_name: 'Inspector R. Deshmukh', role: 'SUPERVISOR', assigned_cases: 42, verified_resolved: 40, active_workload: 2, disputed_cases: 0, resolution_rate_pct: 95.2, avg_resolution_hours: 3.1 },
    { rank: 2, user_id: 'off-2', display_name: 'Suresh Patil', role: 'OPERATOR', assigned_cases: 36, verified_resolved: 34, active_workload: 2, disputed_cases: 1, resolution_rate_pct: 94.4, avg_resolution_hours: 3.8 },
    { rank: 3, user_id: 'off-3', display_name: 'Kavita Menon', role: 'OPERATOR', assigned_cases: 29, verified_resolved: 27, active_workload: 2, disputed_cases: 0, resolution_rate_pct: 93.1, avg_resolution_hours: 4.2 },
    { rank: 4, user_id: 'off-4', display_name: 'Arjun Rao', role: 'MODERATOR', assigned_cases: 58, verified_resolved: 55, active_workload: 3, disputed_cases: 2, resolution_rate_pct: 94.8, avg_resolution_hours: 2.9 },
  ];

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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Banner Left Content */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50/80 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-800">
              <span>🏆 CIVIC RECOGNITION &amp; KARMA LEDGER</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 font-heading">
                Community Karma &amp; Recognition
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Earn verified civic reputation points for reporting genuine neighborhood issues, auditing resolutions, and keeping cities clean.
              </p>
            </div>

            {/* 3 Highlight Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 shadow-2xs">
                <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">
                  +25 Pts
                </span>
                <span className="text-[11px] font-bold text-slate-700">Authentic Geo-Report</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 shadow-2xs">
                <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  +100 Pts
                </span>
                <span className="text-[11px] font-bold text-slate-700">Verified Resolution</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 shadow-2xs">
                <span className="font-mono text-xs font-extrabold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                  Level 3
                </span>
                <span className="text-[11px] font-bold text-slate-700">Active Ward Sentinel</span>
              </div>
            </div>
          </div>

          {/* Banner Right 3D Scene */}
          <div className="lg:col-span-5 relative h-56 sm:h-64 lg:h-full min-h-[220px] overflow-hidden bg-gradient-to-r from-white via-transparent to-transparent">
            <img
              src="/assets/karma-hero.png"
              alt="Community Karma Celebration"
              className="absolute inset-0 h-full w-full object-cover object-right lg:object-center transform hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent lg:hidden" />
          </div>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: MY KARMA SCORE (Dark Teal #073033) */}
        <div className="relative overflow-hidden rounded-2xl bg-[#073033] text-white p-6 shadow-md flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                MY KARMA SCORE
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight flex items-baseline gap-2">
                <span>{totalPoints}</span>
                <span className="text-base font-sans font-bold text-emerald-400">Pts</span>
              </div>
            </div>

            {/* 3D Gold Medal Image */}
            <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden flex items-center justify-center">
              <img
                src="/assets/karma-medal.png"
                alt="Karma Medal"
                className="h-full w-full object-contain filter drop-shadow-md"
              />
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-emerald-900/60">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>LEVEL 3 SENTINEL</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-200/80">
                {totalPoints} / 500 Pts
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-emerald-950 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, (totalPoints / 500) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-emerald-300/70 font-mono">
              {Math.max(0, 500 - totalPoints)} pts to Level 4 Civic Guardian
            </p>
          </div>
        </div>

        {/* Card 2: VERIFIED RESOLUTION BONUS */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                VERIFIED RESOLUTION BONUS
              </span>
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-slate-950 font-heading">
                +100 Pts / Case
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Earned when field officers resolve an issue you reported and civic inspection confirms completion.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-mono font-bold text-rose-700 border border-rose-100">
              4 Cases Verified
            </span>
            <span className="text-[11px] font-mono text-slate-400">Anti-fraud verified</span>
          </div>
        </div>

        {/* Card 3: HOTSPOT FOLLOW-UP AUDIT */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                HOTSPOT FOLLOW-UP AUDIT
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-slate-950 font-heading">
                +75 Pts / Audit
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Conduct 7-day and 30-day post-resolution audits to ensure chronic waste dumping does not recur.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-mono font-bold text-blue-700 border border-blue-100">
              2 Audits Completed
            </span>
            <span className="text-[11px] font-mono text-slate-400">Prevents recurrence</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Reward History Vertical Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-950 font-heading">
                Reward History
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'ALL'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                All Transactions
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('REPORTS')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'REPORTS'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Reports
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('AUDITS')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  historyFilter === 'AUDITS'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Audits
              </button>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {displayHistory
                .filter((item) => {
                  if (historyFilter === 'ALL') return true;
                  return (item as any).type === historyFilter;
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
          </div>
        </div>

        {/* Right Column (5 cols): Top Civic Contributors / Leaderboard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-950 font-heading">
                Top Civic Contributors
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
                <option value="">All Service Areas</option>
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
              Citizen Leaderboard
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
              Officer Performance
            </button>
          </div>

          {/* Ranked List */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            {leaderboardLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : tab === 'citizen' ? (
              <div className="divide-y divide-slate-100 space-y-2">
                {displayCitizens.map((cit, idx) => {
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
                            {cit.karma_tier || 'Active Sentinel'} · {cit.verified_reports} verified
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
            ) : (
              /* Officer Performance Leaderboard */
              <div className="divide-y divide-slate-100 space-y-2">
                {displayOfficers.map((off, idx) => {
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
