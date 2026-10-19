import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseStatus } from '../types';

interface CaseStatusBadgeProps {
  status: CaseStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusThemes: Record<
  CaseStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  DRAFT: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  SUBMITTED: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  REVIEWED: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  FORWARDED: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  ACKNOWLEDGED: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  IN_PROGRESS: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  RESOLUTION_REPORTED: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  VERIFICATION_PENDING: {
    bg: 'bg-amber-50/90',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-600',
  },
  VERIFIED_RESOLVED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  DUPLICATE: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  DISPUTED_CLOSURE: {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
  },
  REOPENED: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  ESCALATED: {
    bg: 'bg-red-50',
    text: 'text-red-900',
    border: 'border-red-300',
    dot: 'bg-red-600',
  },
  UNABLE_TO_RESOLVE: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200',
    dot: 'bg-stone-400',
  },
};

export const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({
  status,
  size = 'sm',
  showDot = true,
}) => {
  const { t } = useTranslation();
  const theme = statusThemes[status] || statusThemes.DRAFT;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  };

  const statusLabel = t(`case.status.${status}`, status.replace(/_/g, ' '));

  return (
    <span
      className={`inline-flex items-center rounded-md border font-sans font-medium tracking-tight ${theme.bg} ${theme.text} ${theme.border} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${theme.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{statusLabel}</span>
    </span>
  );
};

export default CaseStatusBadge;
