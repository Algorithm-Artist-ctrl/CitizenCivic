import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Star,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { getMediaUrl } from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import CaseTimeline from '../components/CaseTimeline';
import ImageUpload from '../components/ImageUpload';
import type { Case, CaseStatus } from '../types';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Action form states
  const [transitionStatus, setTransitionStatus] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isDispute, setIsDispute] = useState(false);
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);

  useEffect(() => {
    fetchCaseDetail();
  }, [id]);

  const fetchCaseDetail = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Case>(`/cases/${id}/`);
      setCaseData(res.data);
    } catch (err: any) {
      console.error('Failed to load case detail', err);
      setError(err.response?.data?.detail || 'Failed to load case details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePerformTransition = async (newStatus: string) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Upload resolution evidence if files attached
      let evidenceRefs: string[] = [];
      if (evidencePhotos.length > 0) {
        for (const file of evidencePhotos) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('evidence_type', newStatus === 'RESOLUTION_REPORTED' ? 'AFTER_PHOTO' : 'PHOTO');
          const evRes = await apiClient.post(`/cases/${id}/evidence/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          evidenceRefs.push(evRes.data.id);
        }
      }

      // 2. Perform transition
      const res = await apiClient.post(`/cases/${id}/transition/`, {
        new_status: newStatus,
        reason: transitionReason || `Transition to ${newStatus} by ${user?.role}`,
        evidence_refs: evidenceRefs.length > 0 ? evidenceRefs : null,
      });

      setCaseData(res.data);
      setTransitionStatus(null);
      setTransitionReason('');
      setEvidencePhotos([]);
      setSuccessMsg(`Case successfully transitioned to ${newStatus}.`);
    } catch (err: any) {
      console.error('Transition error', err);
      setError(err.response?.data?.detail || 'Failed to execute transition.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      await apiClient.post(`/cases/${id}/feedback/`, {
        feedback_type: isDispute ? 'DISPUTE' : 'SATISFACTION',
        rating: isDispute ? 1 : feedbackRating,
        comment: feedbackComment,
        is_dispute: isDispute,
      });

      // If dispute, trigger transition to DISPUTED_CLOSURE if applicable
      if (isDispute && caseData?.status === 'VERIFICATION_PENDING') {
        await apiClient.post(`/cases/${id}/transition/`, {
          new_status: 'DISPUTED_CLOSURE',
          reason: feedbackComment || 'Citizen disputed reported closure.',
        });
      }

      setFeedbackComment('');
      setIsDispute(false);
      setSuccessMsg(isDispute ? 'Dispute raised. Status moved to Disputed Closure for review.' : 'Feedback recorded!');
      await fetchCaseDetail();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="text-red-600 font-semibold">{error || 'Case not found.'}</p>
        <Link to="/cases" className="mt-4 inline-block text-emerald-600 hover:underline">
          Back to Cases
        </Link>
      </div>
    );
  }

  // Check valid transitions for current user role from API response
  const validTransitions: CaseStatus[] = (caseData as any).valid_transitions || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Case Header Card */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {caseData.case_number}
              </span>
              <CaseStatusBadge status={caseData.status} size="lg" />
              {caseData.is_hotspot && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Flame className="h-3.5 w-3.5" /> Recurring Hotspot
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm">
                {(caseData as any).category_detail?.name_en || caseData.category?.name_en}
              </span>
              <span>•</span>
              <span>{(caseData as any).service_area_detail?.name || 'Indiranagar Ward 82'}</span>
              <span>•</span>
              <span>Reported {new Date(caseData.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* SLA & Milestone Timestamps */}
          <div className="flex flex-wrap gap-2 text-xs">
            {caseData.acknowledged_at && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 text-blue-900">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Acknowledged</span>
                <span>{new Date(caseData.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {caseData.resolved_at && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-amber-900">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Resolution Reported</span>
                <span>{new Date(caseData.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {caseData.verified_at && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-emerald-900">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Verified Closed</span>
                <span>{new Date(caseData.verified_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Issue Details & Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Problem Description</h3>
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {caseData.description}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Location & Landmark</h3>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-800">{caseData.landmark}</span>
              </div>
              <div className="font-mono text-slate-500 text-[11px] pl-6">
                {caseData.latitude.toFixed(5)}, {caseData.longitude.toFixed(5)}
              </div>
              <div className="pt-2 pl-6">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${caseData.latitude},${caseData.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline text-[11px]"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Photographic Evidence Gallery */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Field Evidence Photos ({caseData.evidence?.length || 0})
          </h3>
          {caseData.evidence && caseData.evidence.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {caseData.evidence.map((ev, i) => (
                <div key={ev.id || i} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                  <img src={getMediaUrl(ev.file)} alt={ev.evidence_type} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent p-2 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {ev.evidence_type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-300">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No photographic evidence records attached yet.</p>
          )}
        </div>
      </div>

      {/* ROLE-BASED WORKFLOW ACTION CONTROLS */}
      {validTransitions.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold">Authorized Lifecycle Actions ({user?.role})</h2>
            </div>
            <span className="text-xs text-slate-400">Enforced by Server State Machine</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {validTransitions.map((targetStatus) => (
              <button
                key={targetStatus}
                onClick={() => setTransitionStatus(targetStatus)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
              >
                Move to {t(`case.status.${targetStatus}`, targetStatus.replace('_', ' '))}
              </button>
            ))}
          </div>

          {/* Transition Execution Modal / Inline Form */}
          {transitionStatus && (
            <div className="rounded-xl bg-slate-800/80 p-5 border border-slate-700 space-y-4 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-400">
                  Confirm Transition → {transitionStatus.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setTransitionStatus(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Operational Notes (Recorded in Audit Trail)
                </label>
                <textarea
                  rows={2}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="e.g., Cleaned 2 tons of debris; truck deployed; verified on-ground with photos..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Upload after-cleanup photos if reporting resolution */}
              {(transitionStatus === 'RESOLUTION_REPORTED' || transitionStatus === 'VERIFICATION_PENDING') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Upload After-Cleanup Photos (Mandatory for verified resolution)
                  </label>
                  <div className="bg-slate-900 rounded-xl p-2 border border-slate-700">
                    <ImageUpload onFilesSelected={setEvidencePhotos} maxFiles={3} maxSizeMB={10} />
                  </div>
                </div>
              )}

              <button
                disabled={actionLoading}
                onClick={() => handlePerformTransition(transitionStatus)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {actionLoading ? 'Processing...' : `Confirm & Save Transition`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CITIZEN FEEDBACK & DISPUTE SECTION */}
      {user?.role === 'CITIZEN' && (
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>Citizen Feedback & Dispute Rights</span>
            </h3>
            {caseData.status === 'VERIFICATION_PENDING' && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                Action Required: Confirm Cleanup or Dispute
              </span>
            )}
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-slate-700">Feedback Type:</label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="fbType"
                    checked={!isDispute}
                    onChange={() => setIsDispute(false)}
                    className="text-emerald-600"
                  />
                  <span>Resolution Feedback</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-red-600 font-bold">
                  <input
                    type="radio"
                    name="fbType"
                    checked={isDispute}
                    onChange={() => setIsDispute(true)}
                    className="text-red-600"
                  />
                  <span>Dispute Closure (Garbage not cleared)</span>
                </label>
              </div>
            </div>

            {!isDispute && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-600 mr-2">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 text-yellow-400 hover:scale-110 transition-transform"
                  >
                    <Star className={`h-5 w-5 ${star <= feedbackRating ? 'fill-current' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={2}
              required
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={
                isDispute
                  ? 'Explain why this closure is invalid (e.g. only half the lane was cleared, debris remains, dumping resumed immediately)...'
                  : 'Share comments on cleanup quality or speed...'
              }
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />

            <button
              type="submit"
              disabled={actionLoading || !feedbackComment.trim()}
              className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                isDispute ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isDispute ? 'Submit Dispute & Reopen' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      {/* Full Audit Timeline */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <span>Complete Case Audit Timeline</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Immutable State Transitions</span>
        </div>

        <CaseTimeline transitions={caseData.transitions || []} />
      </div>
    </div>
  );
};

export default CaseDetailPage;
