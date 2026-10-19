import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseStatus } from '../types';

interface CaseStatusBadgeProps {
  status: CaseStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<CaseStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  SUBMITTED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  REVIEWED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  FORWARDED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ACKNOWLEDGED: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  RESOLUTION_REPORTED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  VERIFICATION_PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  VERIFIED_RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  DUPLICATE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  DISPUTED_CLOSURE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  REOPENED: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  ESCALATED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
  UNABLE_TO_RESOLVE: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
};

export const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();
  const config = statusConfig[status] || statusConfig.DRAFT;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const statusLabel = t(`case.status.${status}`, status.replace('_', ' '));

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
      {statusLabel}
    </span>
  );
};

export default CaseStatusBadge;
