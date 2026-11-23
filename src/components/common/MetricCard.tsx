import { AnimatedValue } from '../../shared/motion/AnimatedValue';
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
    default: 'bg-slate-50 text-primary border border-slate-200/80 shadow-2xs',
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

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`lw-metric relative min-w-0 bg-white rounded-2xl border ${highlightBorder[variant]} ${onClick ? 'lw-interactive cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-xl [&>svg]:size-4 ${iconStyles[variant]}`}
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-medium text-slate-600">{title}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tracking-tight text-ink tabular-nums">
          <AnimatedValue value={value} />
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
          >
            {trend.isPositive ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};
