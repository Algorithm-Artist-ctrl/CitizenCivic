import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, ArrowRight, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import type { CaseTransition } from '../types';
import CaseStatusBadge from './CaseStatusBadge';

interface CaseTimelineProps {
  transitions: CaseTransition[];
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ transitions }) => {
  const { t } = useTranslation();

  if (!transitions || transitions.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">
        {t('case.noTransitions', 'No timeline records available yet.')}
      </div>
    );
  }

  // Format date safely
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {transitions.map((transition, idx) => {
          const isLast = idx === transitions.length - 1;
          const isVerified = transition.to_status === 'VERIFIED_RESOLVED';
          const isDispute = transition.to_status === 'DISPUTED_CLOSURE';

          return (
            <li key={transition.id || idx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${
                        isVerified
                          ? 'bg-emerald-600 text-white'
                          : isDispute
                          ? 'bg-red-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isVerified ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : isDispute ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {transition.from_status && (
                          <>
                            <CaseStatusBadge status={transition.from_status} size="sm" />
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                          </>
                        )}
                        <CaseStatusBadge status={transition.to_status} size="sm" />
                      </div>
                      {transition.reason && (
                        <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-md p-2 border border-gray-100">
                          {transition.reason}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <UserCheck className="h-3 w-3 text-gray-400" />
                        <span>{transition.actor_name || 'System / Authorized Agent'}</span>
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {formatDate(transition.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CaseTimeline;
