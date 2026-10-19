import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'emerald' | 'amber' | 'red' | 'navy' | 'subtle' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    red: 'bg-rose-50 text-rose-800 border-rose-200/80',
    navy: 'bg-slate-900 text-slate-100 border-slate-800',
    subtle: 'bg-slate-50 text-slate-600 border-slate-200/60',
    outline: 'bg-transparent text-slate-700 border-slate-300',
  };

  const dotClasses = {
    default: 'bg-slate-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    navy: 'bg-emerald-400',
    subtle: 'bg-slate-400',
    outline: 'bg-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
};

export default Badge;
