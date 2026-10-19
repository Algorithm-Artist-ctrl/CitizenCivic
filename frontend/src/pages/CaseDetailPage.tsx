import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Star,
  Camera,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { getMediaUrl } from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import CaseTimeline from '../components/CaseTimeline';
import ImageUpload from '../components/ImageUpload';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import type { Case } from '../types';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Action form states
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);

  // Dispute / Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isDispute, setIsDispute] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleOpenTransition = (newStatus: string) => {
    setPendingStatus(newStatus);
    setTransitionReason('');
    setEvidencePhotos([]);
    setError(null);
    setShowTransitionModal(true);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingStatus) return;

    if (pendingStatus === 'RESOLUTION_REPORTED' && evidencePhotos.length === 0) {
      setError('A completion photograph of the cleared area is required before submitting a resolution claim.');
      return;
    }

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
          formData.append('evidence_type', pendingStatus === 'RESOLUTION_REPORTED' ? 'AFTER_PHOTO' : 'PHOTO');
          const evRes = await apiClient.post(`/cases/${id}/evidence/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          evidenceRefs.push(evRes.data.id);
        }
      }

      // 2. Perform transition
      const res = await apiClient.post(`/cases/${id}/transition/`, {
        new_status: pendingStatus,
        reason: transitionReason || `Transition to ${pendingStatus} executed by ${user?.role}`,
        evidence_refs: evidenceRefs.length > 0 ? evidenceRefs : null,
      });

      setCaseData(res.data);
      setShowTransitionModal(false);
      setPendingStatus(null);
      setTransitionReason('');
      setEvidencePhotos([]);
      setSuccessMsg(`Case successfully transitioned to ${pendingStatus.replace(/_/g, ' ')}.`);
    } catch (err: any) {
      console.error('Transition error', err);
      setError(err.response?.data?.detail || 'Failed to execute transition. Please verify role authorization.');
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
          reason: feedbackComment || 'Citizen disputed reported municipal closure.',
        });
      }

      setShowFeedbackModal(false);
      setFeedbackComment('');
      setIsDispute(false);
      setSuccessMsg(isDispute ? 'Dispute raised. Case returned to Disputed status for supervisor audit.' : 'Feedback recorded! Thank you for verifying your neighborhood.');
      await fetchCaseDetail();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCaseNumber = () => {
    if (caseData) {
      navigator.clipboard.writeText(caseData.case_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Case Record Not Found</h2>
        <p className="mt-1 text-xs text-slate-500">The requested case reference does not exist or has been archived.</p>
        <Link to="/cases" className="mt-4 inline-block text-xs font-semibold text-slate-900 underline">
          Return to Cases Directory
        </Link>
      </div>
    );
  }

  const beforeEvidence = caseData.evidence?.filter((e) => e.evidence_type !== 'AFTER_PHOTO') || [];
  const afterEvidence = caseData.evidence?.filter((e) => e.evidence_type === 'AFTER_PHOTO') || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Top back navigation & case identification */}
      <div className="space-y-3 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <Link
            to="/cases"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to cases directory</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase">
              Ward 82 Master Registry
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-mono font-bold tracking-tight text-slate-950">
              {caseData.case_number}
            </h1>
            <button
              onClick={handleCopyCaseNumber}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Copy Case Number"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <CaseStatusBadge status={caseData.status} size="md" />
            {caseData.is_hotspot && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <Flame className="h-3 w-3" />
                <span>Monitored Hotspot</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Reported: {new Date(caseData.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Notification banners */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ROLE-AWARE ACTION BAR */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-slate-900">
            Available Role Actions ({user?.role})
          </span>
          <p className="text-[11px] text-slate-500">
            {caseData.status === 'VERIFIED_RESOLVED' && 'Case is marked verified resolved with closed audit trail.'}
            {caseData.status === 'VERIFICATION_PENDING' && 'Field resolution claimed. Awaiting citizen confirmation or supervisor verification.'}
            {caseData.status === 'IN_PROGRESS' && 'Municipal response team actively assigned on-ground.'}
            {caseData.status === 'FORWARDED' && 'Dispatched to concessionaire. Awaiting acknowledgement.'}
            {caseData.status === 'SUBMITTED' && 'Report registered. Awaiting initial triage.'}
            {caseData.status === 'DISPUTED_CLOSURE' && 'Citizen disputed claimed closure. Inadequate resolution flagged.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* OPERATOR ACTIONS */}
          {['OPERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && (
            <>
              {caseData.status === 'FORWARDED' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenTransition('ACKNOWLEDGED')}
                >
                  Acknowledge SLA Dispatch
                </Button>
              )}

              {caseData.status === 'ACKNOWLEDGED' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenTransition('IN_PROGRESS')}
                >
                  Start On-Ground Work
                </Button>
              )}

              {(caseData.status === 'IN_PROGRESS' || caseData.status === 'DISPUTED_CLOSURE') && (
                <Button
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={() => handleOpenTransition('RESOLUTION_REPORTED')}
                  icon={<Camera className="h-3.5 w-3.5" />}
                >
                  Submit Resolution Claim + Photo
                </Button>
              )}
            </>
          )}

          {/* VERIFIER / MODERATOR ACTIONS */}
          {['MODERATOR', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '') && (
            <>
              {caseData.status === 'SUBMITTED' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenTransition('REVIEWED')}
                >
                  Mark Reviewed
                </Button>
              )}

              {caseData.status === 'REVIEWED' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenTransition('FORWARDED')}
                >
                  Forward to Operator Team
                </Button>
              )}

              {(caseData.status === 'RESOLUTION_REPORTED' || caseData.status === 'VERIFICATION_PENDING') && (
                <Button
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={() => handleOpenTransition('VERIFIED_RESOLVED')}
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                >
                  Confirm Verified Resolved
                </Button>
              )}
            </>
          )}

          {/* CITIZEN VERIFICATION / DISPUTE ACTIONS */}
          {user?.role === 'CITIZEN' && (
            <>
              {caseData.status === 'VERIFICATION_PENDING' && (
                <>
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={() => {
                      setIsDispute(false);
                      setShowFeedbackModal(true);
                    }}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Confirm Clean (Accept Resolution)
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setIsDispute(true);
                      setShowFeedbackModal(true);
                    }}
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  >
                    Dispute Closure
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* TWO-COLUMN CASE DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Metadata & Evidence Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incident Overview Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              Incident Metadata
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
              <div>
                <span className="text-slate-400 block font-mono text-[11px]">CATEGORY</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {caseData.category?.name_en || 'Municipal Issue'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono text-[11px]">SERVICE AREA</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {caseData.service_area?.name || 'Bengaluru Ward 82'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono text-[11px]">STREET LANDMARK</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {caseData.landmark || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono text-[11px]">GPS GRID COORDINATES</span>
                <span className="font-mono text-slate-700 mt-0.5 block">
                  {caseData.latitude?.toFixed(4)}° N, {caseData.longitude?.toFixed(4)}° E
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block font-mono text-[11px]">PROBLEM DESCRIPTION</span>
              <p className="text-xs text-slate-800 leading-relaxed bg-slate-50/70 p-3 rounded border border-slate-100">
                {caseData.description}
              </p>
            </div>
          </div>

          {/* Photographic Proof Gallery: Before vs After */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-slate-600" />
                <span>Photographic Evidence Archive</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {caseData.evidence?.length || 0} photo(s) on file
              </span>
            </div>

            {/* Before Evidence */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Incident Report Photos (Before Cleanup)</span>
              </span>
              {beforeEvidence.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No initial photo recorded.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {beforeEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="group relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                    >
                      <img
                        src={getMediaUrl(ev.file)}
                        alt="Initial evidence"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent p-2 flex items-end">
                        <span className="text-[10px] font-mono text-white truncate">
                          {new Date(ev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* After Evidence (Resolution Proof) */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>On-Ground Resolution Proof (After Cleanup)</span>
              </span>
              {afterEvidence.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                  Field team has not uploaded completion proof yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {afterEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="group relative aspect-4/3 rounded-lg overflow-hidden border border-emerald-300 bg-slate-100 shadow-2xs ring-1 ring-emerald-200"
                    >
                      <img
                        src={getMediaUrl(ev.file)}
                        alt="Resolution proof"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent p-2 flex items-end justify-between">
                        <span className="text-[10px] font-mono text-emerald-300">
                          CLEARED PROOF
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Timeline & Immutable Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Immutable Transition Log</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Tamper-Evident
              </span>
            </div>

            <CaseTimeline transitions={caseData.transitions || []} />
          </div>
        </div>
      </div>

      {/* TRANSITION MODAL */}
      <Modal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        title={`Advance Case: ${pendingStatus?.replace(/_/g, ' ')}`}
        description="Provide a justification rationale and upload on-ground evidence where required."
      >
        <form onSubmit={handleExecuteTransition} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              Transition Reason / Work Log
            </label>
            <textarea
              rows={3}
              required
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Rapid response team dispatched with 2 tipper trucks. 350kg debris collected."
              className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          {pendingStatus === 'RESOLUTION_REPORTED' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-xs font-semibold text-slate-800">
                Photographic Completion Proof <span className="text-rose-600">*</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Field operators must attach a clear on-ground photograph showing the clean spot.
              </p>
              <ImageUpload
                onFilesSelected={(f) => setEvidencePhotos(f)}
                maxFiles={2}
                label="Upload photo of cleared pavement/bin"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={() => setShowTransitionModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={actionLoading}
            >
              Confirm State Change &rarr;
            </Button>
          </div>
        </form>
      </Modal>

      {/* FEEDBACK & DISPUTE MODAL */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title={isDispute ? 'Dispute Municipal Resolution' : 'Confirm Verified Resolution'}
        description={
          isDispute
            ? 'State why the claimed cleanup is incomplete or unsatisfactory. This will return the ticket to municipal supervisors.'
            : 'Share your satisfaction rating on the response turnaround and cleanup quality.'
        }
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4 font-sans">
          {!isDispute && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Resolution Quality Rating (1 - 5 Stars)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= feedbackRating
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              {isDispute ? 'Reason for Dispute' : 'Verification Comments'}
            </label>
            <textarea
              rows={3}
              required
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={
                isDispute
                  ? 'e.g. Only top garbage removed. Heavy debris still blocking pedestrian walkway.'
                  : 'e.g. Cleaned thoroughly within 4 hours. Great response.'
              }
              className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={() => setShowFeedbackModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isDispute ? 'destructive' : 'emerald'}
              size="md"
              loading={actionLoading}
            >
              {isDispute ? 'Submit Dispute Ticket' : 'Confirm Clean & Close'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CaseDetailPage;
