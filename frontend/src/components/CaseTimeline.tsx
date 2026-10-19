import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Forward,
  Wrench,
  FileCheck,
} from 'lucide-react';
import type { CaseTransition } from '../types';
import CaseStatusBadge from './CaseStatusBadge';

interface CaseTimelineProps {
  transitions: CaseTransition[];
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ transitions }) => {
  const { t } = useTranslation();

  if (!transitions || transitions.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
        {t('case.noTransitions', 'No status changes recorded yet.')}
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getTransitionIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED_RESOLVED':
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      case 'DISPUTED_CLOSURE':
      case 'ESCALATED':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'RESOLUTION_REPORTED':
      case 'VERIFICATION_PENDING':
        return <FileCheck className="h-4 w-4 text-amber-600" />;
      case 'IN_PROGRESS':
        return <Wrench className="h-4 w-4 text-amber-600" />;
      case 'FORWARDED':
        return <Forward className="h-4 w-4 text-purple-600" />;
      case 'REOPENED':
        return <RotateCcw className="h-4 w-4 text-sky-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
      {transitions.map((transition, idx) => {
        const isVerified = transition.to_status === 'VERIFIED_RESOLVED';
        const isDispute = transition.to_status === 'DISPUTED_CLOSURE';

        return (
          <div key={transition.id || idx} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-2xs ${
                isVerified
                  ? 'border-emerald-500 text-emerald-600 ring-2 ring-emerald-100'
                  : isDispute
                  ? 'border-rose-500 text-rose-600 ring-2 ring-rose-100'
                  : 'border-slate-300 text-slate-600'
              }`}
            >
              {getTransitionIcon(transition.to_status)}
            </div>

            {/* Content card */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {transition.from_status && (
                    <>
                      <CaseStatusBadge status={transition.from_status} size="xs" showDot={false} />
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    </>
                  )}
                  <CaseStatusBadge status={transition.to_status} size="xs" />
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{formatDate(transition.created_at)}</span>
                </div>
              </div>

              {transition.reason && (
                <p className="mt-2 text-xs text-slate-700 bg-slate-50/70 rounded p-2 border border-slate-100 font-sans">
                  "{transition.reason}"
                </p>
              )}

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {transition.actor_name || 'System / Authorized Agent'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Immutable Audit Log
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CaseTimeline;
