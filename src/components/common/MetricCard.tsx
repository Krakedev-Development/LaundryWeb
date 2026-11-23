import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedMetricValue } from '../ui/AnimatedMetricValue';

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
    default: 'border-slate-200/80 hover:border-primary/25',
    urgent: 'border-rose-200/80 hover:border-rose-300',
    warning: 'border-amber-200/80 hover:border-amber-300',
    success: 'border-emerald-200/80 hover:border-emerald-300',
    aqua: 'border-sky-200/80 hover:border-sky-300',
  };

  const topAccent = {
    default: 'from-slate-300/60 via-primary/25 to-transparent',
    urgent: 'from-rose-500 via-rose-400/50 to-transparent',
    warning: 'from-amber-500 via-amber-400/50 to-transparent',
    success: 'from-emerald-500 via-emerald-400/50 to-transparent',
    aqua: 'from-sky-500 via-cyan-400/50 to-transparent',
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{ boxShadow: 'var(--shadow-card)' }}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 sm:p-6 transition-colors duration-200 hover:shadow-[var(--shadow-card-hover)] ${highlightBorder[variant]} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${topAccent[variant]}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold tracking-wide text-subtle">
            {title}
          </p>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
            <AnimatedMetricValue
              value={value}
              className="text-3xl font-extrabold tracking-tight text-ink"
            />
            {trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                  trend.isPositive
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700'
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
            <p className="mt-1.5 line-clamp-1 text-xs font-medium text-subtle">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl p-3 transition-transform duration-200 group-hover:scale-105 ${iconStyles[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
};
