import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  ShieldCheck,
  Clock,
  PlusCircle,
  Users,
  MapPin,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import Badge from '../components/ui/Badge';

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
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<'citizen' | 'officer'>(
    tabParam === 'officer' ? 'officer' : 'citizen'
  );

  const isOfficer = !!(user && ['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user.role));

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
  const [areaDisplayName, setAreaDisplayName] = useState<string>('All Service Areas');

  const [citizenList, setCitizenList] = useState<LeaderboardCitizen[]>([]);
  const [officerList, setOfficerList] = useState<LeaderboardOfficer[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
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
            ? apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: 0, history: [] } }))
            : Promise.resolve({ data: { total_points: 0, history: [] } }),
        ]);

        const areas = areasRes.data.results || areasRes.data || [];
        setServiceAreas(areas);

        const mpData: any = myPointsRes.data;
        if (mpData) {
          setTotalPoints(mpData.total_points || 0);
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

        setAreaDisplayName(data.area_name || data.ward || (selectedAreaId ? 'Selected Area' : 'All Service Areas'));

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

  const getTier = (points: number) => {
    if (points >= 1500) return { title: 'Civic Guardian (Tier 3)', badge: 'emerald', next: 'Maximum Tier Achieved' };
    if (points >= 500) return { title: 'Community Warden (Tier 2)', badge: 'amber', next: `${1500 - points} pts to Civic Guardian` };
    return { title: 'Neighborhood Sentinel (Tier 1)', badge: 'default', next: `${500 - points} pts to Community Warden` };
  };

  const currentTier = getTier(totalPoints);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Page Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
            <Award className="h-4 w-4" />
            <span>{t('rewards.masthead') || 'Civic Recognition & Performance Ledger'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-1 font-heading">
            {t('rewards.title') || 'Community Karma & Officer Recognition'}
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {t('rewards.subtitle') || 'Auditable points credited for verified reporting, photographic accuracy, and on-ground audits.'}
          </p>
        </div>

        {isOfficer ? (
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>{t('rewards.viewFieldDirectory') || 'View Field Directory'}</span>
          </Link>
        ) : (
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-emerald-400" />
            <span>{t('rewards.reportIssue') || 'Report Issue (+10 Pts)'}</span>
          </Link>
        )}
      </div>

      {/* User Standing & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isOfficer && user ? (
          <div className="rounded-xl border border-slate-900 bg-slate-950 text-white p-6 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                {t('rewards.officerStanding') || 'Municipal Field Standing'}
              </span>
              <div className="mt-2 text-3xl font-extrabold font-tabular text-white font-mono flex items-center gap-2">
                {user.role} <span className="text-xs font-normal text-slate-400 font-sans">Active Staff</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{user.display_name} • Operational Roster</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Jurisdiction oversight active</span>
              <Link to="/cases" className="text-emerald-400 hover:text-emerald-300 underline font-medium">
                Open Case Queue &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-900 bg-slate-950 text-white p-6 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                {t('rewards.myScore') || 'Personal Balance'}
              </span>
              <div className="mt-2 text-4xl font-extrabold font-tabular text-white font-mono">
                {totalPoints} <span className="text-sm font-normal text-slate-400 font-sans">pts</span>
              </div>
              {!user ? (
                <div className="mt-2 text-xs text-slate-400">
                  <Link to="/login" className="text-emerald-400 underline hover:text-emerald-300 font-medium">
                    {t('nav.login') || 'Sign in'}
                  </Link>{' '}
                  to view and track your verified points
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{currentTier.title}</span>
                </div>
              )}
            </div>
            <p className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              {user ? currentTier.next : 'Verified civic reporting ledger'}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            {i18n.language === 'hi' ? 'सत्यापित समाधान बोनस' : 'Verified Resolution Bonus'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-heading">+100 Pts / Case</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {i18n.language === 'hi'
              ? 'जब आपके द्वारा रिपोर्ट की गई समस्या साफ हो जाती है और जमीनी तस्वीर से पुष्टि हो जाती है।'
              : 'When your reported issue is cleared and confirmed with on-ground photographic evidence.'}
          </p>
          <div className="text-[11px] font-mono text-emerald-700 font-medium">
            Strict anti-duplicate fraud filters applied
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            {i18n.language === 'hi' ? 'हॉटस्पॉट फॉलो-अप ऑडिट' : 'Hotspot Follow-Up Audit'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-heading">+75 Pts / Audit</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {i18n.language === 'hi'
              ? 'सत्यापित करें कि 7-दिन और 30-दिन के ऑडिट के दौरान पहले से सुलझाया गया ब्लैकस्पॉट साफ रहा है।'
              : 'Verify that a previously resolved blackspot has remained clean during 7-day and 30-day checks.'}
          </p>
          <div className="text-[11px] font-mono text-emerald-700 font-medium">
            Prevents recurring illegal waste accumulation
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Activity History / Directives, Right = Dual Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Directives for Officers OR Activity History for Citizens */}
        <div className="lg:col-span-5 space-y-4">
          {isOfficer && user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>{t('rewards.officerGuidelinesTitle') || 'Oversight & Verification Directives'}</span>
                </h2>
                <span className="text-xs font-mono text-emerald-800 font-semibold">{user.role} Protocols</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 font-heading">
                      {t('rewards.guideline1Title') || 'Photographic Ground Truth'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {t('rewards.guideline1Desc') || 'Every resolution reported by an operator must include clear on-site photographs proving the hazard or waste has been cleared before case closure.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 font-heading">
                      {t('rewards.guideline2Title') || 'Turnaround SLA (< 4.0 Hours)'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {t('rewards.guideline2Desc') || 'Forwarded tickets require prompt acknowledgement. Operators maintaining fast turnaround rates receive higher standing in the performance rankings.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 font-heading">
                      {t('rewards.guideline3Title') || 'Dispute & Reopen Accountability'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {t('rewards.guideline3Desc') || 'Citizens possess dispute rights. If a closed report is challenged with contrary ground evidence, supervisory review is immediately triggered.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">Civic Integrity Protocol v2.4</span>
                  <Link to="/cases" className="text-xs font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1">
                    <span>Manage Assigned Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {recentEntries.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-700 mb-2 font-mono uppercase tracking-wider">
                    Your Personal Karma Ledger
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                    {recentEntries.map((entry) => (
                      <div key={entry.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-900">{entry.reason}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          +{entry.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  <span>{t('rewards.historyTitle') || 'Your Verified Karma Activity'}</span>
                </h2>
                <span className="text-xs text-slate-500">Latest 20 records</span>
              </div>

              {recentEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
                  <Award className="mx-auto h-8 w-8 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-800 font-heading">
                    {t('rewards.noTransactions') || 'No karma points recorded yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Submit your first verified civic report or audit an existing case to begin building your community standing.
                  </p>
                  <Link
                    to="/report"
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
                  >
                    {t('landing.reportIssue') || 'Report an Issue'}
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {recentEntries.map((entry) => (
                    <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">{entry.reason}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {new Date(entry.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                        +{entry.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Dual Leaderboards (Citizen vs Officer) with Service Area Filter */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls: Segmented Tabs & Service Area Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            {/* Segmented Tab Controls */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleTabChange('citizen')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tab === 'citizen'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-emerald-700" />
                <span>{t('rewards.tabCitizen') || 'Citizen Leaderboard'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('officer')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tab === 'officer'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                <span>{t('rewards.tabOfficer') || 'Officer Performance'}</span>
              </button>
            </div>

            {/* Service Area Filter Selector */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <label htmlFor="area-filter-select" className="sr-only">
                {t('rewards.filterArea') || 'Filter by Service Area'}
              </label>
              <select
                id="area-filter-select"
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="text-xs border border-slate-200 rounded-md py-1 px-2.5 bg-white text-slate-800 font-medium focus:border-slate-900 focus:outline-hidden"
              >
                <option value="">{t('rewards.allAreas') || 'All Service Areas'}</option>
                {serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {i18n.language === 'hi' ? (sa.name_hi || sa.name) : sa.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subheader with active zone & live roster badge */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-emerald-700" />
              <span>{areaDisplayName}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {tab === 'citizen' ? 'Verified Citizen Karma' : 'Official Performance Metrics'}
            </span>
          </div>

          {/* Leaderboard Table / Cards */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {leaderboardLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span className="text-xs text-slate-500">Updating leaderboard metrics...</span>
              </div>
            ) : tab === 'citizen' ? (
              /* CITIZEN LEADERBOARD */
              <div>
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500 grid grid-cols-12 gap-2">
                  <div className="col-span-2">{t('rewards.rank') || 'Rank'}</div>
                  <div className="col-span-6">{t('rewards.citizenName') || 'Citizen Contributor'}</div>
                  <div className="col-span-2 text-center">Reports</div>
                  <div className="col-span-2 text-right">{t('rewards.karmaEarned') || 'Points'}</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {citizenList.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Award className="mx-auto h-6 w-6 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-800 font-heading">
                        {t('rewards.noLeaderboard') || 'No community contributors recorded yet.'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Points are credited dynamically when on-ground photographic evidence is approved.
                      </p>
                    </div>
                  ) : (
                    citizenList.slice(0, 20).map((entry, index) => (
                      <div
                        key={entry.user_id || index}
                        className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-xs ${
                          entry.user_id === user?.id ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="col-span-2 font-mono font-bold">
                          {index === 0 ? (
                            <span className="text-amber-600">🥇 #01</span>
                          ) : index === 1 ? (
                            <span className="text-slate-500">🥈 #02</span>
                          ) : index === 2 ? (
                            <span className="text-amber-700">🥉 #03</span>
                          ) : (
                            <span className="text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                          )}
                        </div>
                        <div className="col-span-6 flex items-center gap-2 truncate">
                          <span className="text-slate-900 font-medium truncate">{entry.display_name}</span>
                          {entry.user_id === user?.id && (
                            <span className="text-[10px] font-mono text-emerald-700 uppercase bg-emerald-100/70 px-1.5 py-0.2 rounded shrink-0">
                              (You)
                            </span>
                          )}
                          {entry.karma_tier && (
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                              {entry.karma_tier}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-center font-mono text-slate-600 text-[11px]">
                          {entry.verified_reports}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-slate-950">
                          {entry.total_points} pts
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* OFFICER PERFORMANCE LEADERBOARD */
              <div>
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500 grid grid-cols-12 gap-2">
                  <div className="col-span-1">{t('rewards.rank') || 'Rank'}</div>
                  <div className="col-span-4">{t('rewards.officerName') || 'Field Officer / Lead'}</div>
                  <div className="col-span-2 text-center">{t('rewards.assignedCases') || 'Assigned'}</div>
                  <div className="col-span-2 text-center">{t('rewards.verifiedResolved') || 'Resolved'}</div>
                  <div className="col-span-3 text-right">{t('rewards.resolutionRate') || 'Rate & Speed'}</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {officerList.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <ShieldCheck className="mx-auto h-6 w-6 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-800 font-heading">
                        {t('rewards.noOfficerLeaderboard') || 'No officer resolution records found for this area.'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Metrics update automatically when operators acknowledge and verify resolution closures.
                      </p>
                    </div>
                  ) : (
                    officerList.map((officer, index) => (
                      <div
                        key={officer.user_id || index}
                        className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-xs hover:bg-slate-50/50 transition-colors ${
                          officer.user_id === user?.id ? 'bg-blue-50/60 font-semibold' : ''
                        }`}
                      >
                        <div className="col-span-1 font-mono font-bold">
                          {index === 0 ? (
                            <span className="text-amber-600">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-slate-500">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-amber-700">🥉</span>
                          ) : (
                            <span className="text-slate-400">#{index + 1}</span>
                          )}
                        </div>
                        <div className="col-span-4 space-y-0.5 truncate">
                          <div className="text-slate-900 font-medium truncate flex items-center gap-1.5">
                            <span className="truncate">{officer.display_name}</span>
                            {officer.user_id === user?.id && (
                              <span className="text-[9px] font-mono text-blue-700 uppercase bg-blue-100/70 px-1 rounded shrink-0">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <Badge variant={officer.role === 'OPERATOR' ? 'navy' : officer.role === 'SUPERVISOR' ? 'amber' : 'default'} size="xs">
                              {officer.role}
                            </Badge>
                            {officer.active_workload > 0 && (
                              <span className="text-amber-700">({officer.active_workload} active)</span>
                            )}
                          </div>
                        </div>

                        {/* Assigned count */}
                        <div className="col-span-2 text-center font-mono font-medium text-slate-700">
                          {officer.assigned_cases}
                        </div>

                        {/* Verified Resolved count */}
                        <div className="col-span-2 text-center font-mono font-bold text-emerald-700">
                          {officer.verified_resolved}
                        </div>

                        {/* Resolution rate and avg speed */}
                        <div className="col-span-3 text-right space-y-0.5">
                          <div className="font-mono font-bold text-slate-900">
                            {officer.resolution_rate_pct}%
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {officer.avg_resolution_hours > 0 ? (
                              <span>~{officer.avg_resolution_hours} {t('rewards.hours') || 'hrs'}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
