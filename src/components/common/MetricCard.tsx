import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'urgent' | 'warning' | 'success' | 'aqua';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
  onClick,
  className = '',
}) => {
  const iconStyles = {
    default: 'bg-slate-50 text-[#0F4C81] border border-slate-200/80 shadow-2xs',
    urgent: 'bg-rose-50 text-rose-600 border border-rose-200/80 shadow-2xs',
    warning: 'bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs',
    success:
      'bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs',
    aqua: 'bg-sky-50 text-sky-600 border border-sky-200/80 shadow-2xs',
  };

  const highlightBorder = {
    default: 'border-slate-200/80 hover:border-slate-300',
    urgent: 'border-rose-200 hover:border-rose-300',
    warning: 'border-amber-200 hover:border-amber-300',
    success: 'border-emerald-200 hover:border-emerald-300',
    aqua: 'border-sky-200 hover:border-sky-300',
  };

  const topAccent = {
    default: 'from-slate-300/60 via-sky-500/30 to-transparent',
    urgent: 'from-rose-500 via-rose-400/50 to-transparent',
    warning: 'from-amber-500 via-amber-400/50 to-transparent',
    success: 'from-emerald-500 via-emerald-400/50 to-transparent',
    aqua: 'from-sky-500 via-cyan-400/50 to-transparent',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white rounded-2xl border p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${highlightBorder[variant]} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${topAccent[variant]}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums border ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                    : 'bg-rose-50 text-rose-700 border-rose-200/70'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                ) : (
                  <TrendingDown
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs font-medium text-slate-500 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`p-3 rounded-xl shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${iconStyles[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
