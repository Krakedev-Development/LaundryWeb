import React from 'react';

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
    default: 'bg-slate-50 text-slate-600 border border-slate-100',
    urgent: 'bg-rose-50 text-rose-600 border border-rose-100',
    warning: 'bg-amber-50 text-amber-600 border border-amber-100',
    success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    aqua: 'bg-sky-50 text-sky-600 border border-sky-100',
  };

  const highlightBorder = {
    default: 'border-slate-200/80 hover:border-slate-300',
    urgent: 'border-rose-200 hover:border-rose-300',
    warning: 'border-amber-200 hover:border-amber-300',
    success: 'border-emerald-200 hover:border-emerald-300',
    aqua: 'border-sky-200 hover:border-sky-300',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${highlightBorder[variant]} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className={`p-3 rounded-xl shrink-0 flex items-center justify-center ${iconStyles[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
