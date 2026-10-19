import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  ShieldCheck,
  Clock,
  TrendingUp,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

interface LeaderboardUser {
  user_id: string;
  display_name: string;
  total_points: number;
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

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRewardsData();
  }, [user]);

  const loadRewardsData = async () => {
    setLoading(true);
    try {
      const [leaderboardRes, myPointsRes] = await Promise.all([
        apiClient.get<LeaderboardUser[]>('/rewards/leaderboard/').catch(() => ({ data: [] })),
        user ? apiClient.get('/rewards/my-points/').catch(() => ({ data: { total_points: 0, recent_entries: [] } })) : Promise.resolve({ data: { total_points: 0, recent_entries: [] } }),
      ]);

      const lbData: any = leaderboardRes.data;
      const lbList = Array.isArray(lbData) ? lbData : (Array.isArray(lbData?.leaderboard) ? lbData.leaderboard : []);
      setLeaderboard(lbList);

      const mpData: any = myPointsRes.data;
      if (mpData) {
        setTotalPoints(mpData.total_points || 0);
        const entries = Array.isArray(mpData.recent_entries)
          ? mpData.recent_entries
          : (Array.isArray(mpData.history) ? mpData.history : []);
        setRecentEntries(entries);
      }
    } catch (err) {
      console.error('Error fetching rewards data', err);
    } finally {
      setLoading(false);
    }
  };

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
            <span>{t('rewards.masthead') || 'Civic Recognition & Karma Ledger'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-1 font-heading">
            {t('rewards.title') || 'Community Karma & Recognition'}
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {t('rewards.subtitle') || 'Auditable points credited for verified reporting, photographic accuracy, and on-ground audits.'}
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
        >
          <PlusCircle className="h-4 w-4 text-emerald-400" />
          <span>{t('rewards.reportIssue') || 'Report Issue (+10 Pts)'}</span>
        </Link>
      </div>

      {/* User Karma Standing Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Main Content: Ledger History & Ward 82 Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: User's Recent Ledger Entries */}
        <div className="lg:col-span-6 space-y-4">
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

        {/* Right: Ward 82 Community Leaderboard */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>{t('rewards.leaderboardTitle') || 'Ward 82 Community Leaderboard'}</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">Live Pilot Roster</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500 grid grid-cols-12 gap-2">
              <div className="col-span-2">{t('rewards.rank') || 'Rank'}</div>
              <div className="col-span-7">{t('rewards.contributor') || 'Citizen / Contributor'}</div>
              <div className="col-span-3 text-right">{t('rewards.points') || 'Points'}</div>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Award className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-800 font-heading">
                    {t('rewards.noLeaderboard') || 'No community contributors recorded yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Verified civic points are credited dynamically upon approved resolution and on-ground audits.
                  </p>
                </div>
              ) : (
                leaderboard.slice(0, 15).map((entry, index) => (
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
                    <div className="col-span-7 truncate">
                      <span className="text-slate-900 font-medium">{entry.display_name}</span>
                      {entry.user_id === user?.id && (
                        <span className="ml-2 text-[10px] font-mono text-emerald-700 uppercase bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 text-right font-mono font-bold text-slate-950">
                      {entry.total_points} pts
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
