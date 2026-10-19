import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  ExternalLink,
  Award,
  Landmark,
  Wrench,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import Button from '../components/ui/Button';

interface OfficerQueueItem {
  id: string;
  case_number: string;
  status: string;
  description: string;
  landmark: string;
  latitude: number;
  longitude: number;
  is_hotspot: boolean;
  location_source?: string;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  category_name: string;
  service_area_name?: string | null;
  reporter_name: string;
  operator_name?: string | null;
}

export const OfficerPortalPage: React.FC = () => {
  const { user } = useAuth();

  const [queue, setQueue] = useState<OfficerQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'VERIFICATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const fetchQueue = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    setActionErrorMsg(null);
    try {
      const res = await apiClient.get<{
        officer_role: string;
        officer_name: string;
        is_verified: boolean;
        count: number;
        queue: OfficerQueueItem[];
      }>('/cases/officer/queue');

      setQueue(res.data.queue || []);
    } catch (err: any) {
      console.error('Failed to load officer queue', err);
      setActionErrorMsg(err.response?.data?.detail || 'Failed to fetch authorized officer queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleTransition = async (caseId: string, newStatus: string, defaultReason: string) => {
    const reasonPrompt = window.prompt(
      `Confirm status update to "${newStatus}". Enter mandatory operational remarks:`,
      defaultReason
    );
    if (!reasonPrompt) return;

    setActionInProgress(caseId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await apiClient.post(`/cases/${caseId}/transition/`, {
        new_status: newStatus,
        reason: reasonPrompt.trim(),
      });
      setActionSuccessMsg(`Case transition to ${newStatus} recorded successfully.`);
      await fetchQueue(true);
    } catch (err: any) {
      console.error('Transition error', err);
      setActionErrorMsg(err.response?.data?.detail || 'Action failed. Please check permissions and try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter items
  const filteredQueue = queue.filter((item) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.case_number.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.landmark.toLowerCase().includes(q) ||
        item.category_name.toLowerCase().includes(q) ||
        item.reporter_name.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (filterTab === 'ACTION_REQUIRED') {
      return ['SUBMITTED', 'FORWARDED'].includes(item.status);
    }
    if (filterTab === 'IN_PROGRESS') {
      return ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(item.status);
    }
    if (filterTab === 'VERIFICATION') {
      return ['RESOLUTION_REPORTED', 'VERIFICATION_PENDING', 'DISPUTED_CLOSURE'].includes(item.status);
    }
    return true;
  });

  const actionRequiredCount = queue.filter((c) => ['SUBMITTED', 'FORWARDED'].includes(c.status)).length;
  const inProgressCount = queue.filter((c) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)).length;
  const verificationCount = queue.filter((c) => ['RESOLUTION_REPORTED', 'VERIFICATION_PENDING', 'DISPUTED_CLOSURE'].includes(c.status)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Officer Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Verified Municipal Personnel
              </span>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase text-white">
                {user?.role || 'OFFICER'}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                Ward 82 (Indiranagar Pilot)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Municipal Operations & Triage Workspace
            </h1>
            <p className="text-xs text-slate-500">
              Authorized municipal officer dashboard for complaint triage, physical field verification, and resolution reporting.
            </p>
          </div>

          {/* Quick Cross-Portal Links */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link
              to="/rewards?tab=citizen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Award className="h-3.5 w-3.5 text-amber-600" />
              <span>Citizens Leaderboard</span>
            </Link>
            <Link
              to="/rewards?tab=officer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Officer Standings</span>
            </Link>
            <Link
              to="/municipal"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Landmark className="h-3.5 w-3.5 text-indigo-600" />
              <span>CityFinance Data</span>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Queue</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{queue.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Assigned & role-filtered</div>
          </div>
          <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200/80">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Needs Action</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{actionRequiredCount}</div>
            <div className="text-[10px] text-amber-700/80 mt-0.5">Pending triage / ack</div>
          </div>
          <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-200/80">
            <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">In Progress</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{inProgressCount}</div>
            <div className="text-[10px] text-blue-700/80 mt-0.5">Physical repairs underway</div>
          </div>
          <div className="rounded-xl bg-emerald-50/60 p-4 border border-emerald-200/80">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Pending Audit</div>
            <div className="mt-1 text-2xl font-bold text-emerald-900">{verificationCount}</div>
            <div className="text-[10px] text-emerald-700/80 mt-0.5">Requires supervisor sign-off</div>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccessMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-900 border border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Main Queue Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Segmented Filter Tabs */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                filterTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All Tasks ({queue.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('ACTION_REQUIRED')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                filterTab === 'ACTION_REQUIRED' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Action Required ({actionRequiredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('IN_PROGRESS')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                filterTab === 'IN_PROGRESS' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('VERIFICATION')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                filterTab === 'VERIFICATION' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Pending Audit ({verificationCount})
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search case #, landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchQueue(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Refresh Work Queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Queue Items */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Operational Queue Clear</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no pending tickets matching your filter. New complaints registered by citizens will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQueue.map((item) => {
              const isItemBusy = actionInProgress === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 hover:border-slate-300 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                        {item.case_number}
                      </span>
                      <CaseStatusBadge status={item.status as any} />
                      <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        {item.category_name}
                      </span>
                      {item.is_hotspot && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <Flame className="h-3 w-3 text-rose-600" />
                          Hotspot
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Description & Landmark */}
                  <div className="space-y-1">
                    <p className="text-xs text-slate-800 leading-relaxed font-normal">{item.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700">📍 {item.landmark}</span>
                      <span>·</span>
                      <span className="font-mono">({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})</span>
                      <span>·</span>
                      <span>Reported by: <span className="font-medium text-slate-700">{item.reporter_name}</span></span>
                      {item.operator_name && (
                        <>
                          <span>·</span>
                          <span>Assigned: <span className="font-medium text-slate-900">{item.operator_name}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-100 gap-3">
                    <Link
                      to={`/cases/${item.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span>Inspect Full Audit Dossier</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {/* Dynamic Action Buttons based on Status and User Role */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Operator Actions */}
                      {user?.role === 'OPERATOR' && item.status === 'FORWARDED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isItemBusy}
                          onClick={() => handleTransition(item.id, 'ACKNOWLEDGED', 'Operator acknowledged ticket for field inspection.')}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Acknowledge Receipt
                        </Button>
                      )}

                      {user?.role === 'OPERATOR' && item.status === 'ACKNOWLEDGED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isItemBusy}
                          onClick={() => handleTransition(item.id, 'IN_PROGRESS', 'Crew mobilized on site; physical remediation initiated.')}
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          Commence Work
                        </Button>
                      )}

                      {user?.role === 'OPERATOR' && item.status === 'IN_PROGRESS' && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isItemBusy}
                          className="bg-emerald-700 hover:bg-emerald-800"
                          onClick={() => handleTransition(item.id, 'RESOLUTION_REPORTED', 'Repairs completed by field team. Ready for supervisor audit.')}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Report Resolution
                        </Button>
                      )}

                      {/* Moderator / Supervisor Actions */}
                      {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && item.status === 'SUBMITTED' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={isItemBusy}
                            onClick={() => handleTransition(item.id, 'REVIEWED', 'Complaint verified as authentic civic concern.')}
                          >
                            Mark Reviewed
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={isItemBusy}
                            onClick={() => handleTransition(item.id, 'FORWARDED', 'Forwarded to Indiranagar Ward 82 field engineering team.')}
                          >
                            Forward to Field
                          </Button>
                        </>
                      )}

                      {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && item.status === 'REVIEWED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isItemBusy}
                          onClick={() => handleTransition(item.id, 'FORWARDED', 'Forwarded to Indiranagar Ward 82 field engineering team.')}
                        >
                          Forward to Field
                        </Button>
                      )}

                      {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && item.status === 'RESOLUTION_REPORTED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isItemBusy}
                          onClick={() => handleTransition(item.id, 'VERIFICATION_PENDING', 'Auditor reviewing resolution photos and field report.')}
                        >
                          Open Verification Review
                        </Button>
                      )}

                      {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && (item.status === 'VERIFICATION_PENDING' || item.status === 'DISPUTED_CLOSURE') && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isItemBusy}
                          className="bg-emerald-700 hover:bg-emerald-800"
                          onClick={() => handleTransition(item.id, 'VERIFIED_RESOLVED', 'Physical and photographic verification satisfied. Issue closed.')}
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Approve Verified Resolution
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerPortalPage;
