import React from 'react';
import { OrderPriority, SLARisk } from '../../types';
import { AlertCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export const PriorityBadge: React.FC<{ priority: OrderPriority; showIcon?: boolean }> = ({
  priority,
  showIcon = false,
}) => {
  if (priority === 'URGENT') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        {showIcon && <AlertCircle className="w-3 h-3 text-rose-600" />}
        Urgente
      </span>
    );
  }

  if (priority === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Alta
      </span>
    );
  }

  if (priority === 'NORMAL') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        Normal
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-normal whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
      Baja
    </span>
  );
};

export const SLABadge: React.FC<{ risk: SLARisk; progressPercent?: number; deadline?: string }> = ({
  risk,
  progressPercent,
  deadline,
}) => {
  const configs: Record<SLARisk, { label: string; text: string; dot: string; icon: React.ReactNode }> = {
    ON_TIME: {
      label: 'A tiempo',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    ATTENTION: {
      label: 'Atención',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    AT_RISK: {
      label: 'En riesgo',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />,
    },
    OVERDUE: {
      label: 'Vencida',
      text: 'text-rose-700 font-bold',
      dot: 'bg-rose-500',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
  };

  const conf = configs[risk] || configs.ON_TIME;

  return (
    <div className="inline-flex flex-col gap-0.5">
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${conf.text} whitespace-nowrap`}>
        {conf.icon}
        <span>{conf.label}</span>
        {progressPercent !== undefined && (
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            ({progressPercent}%)
          </span>
        )}
      </div>
      {deadline && (
        <span className="text-[11px] text-slate-400 font-normal tabular-nums">
          Límite: {deadline}
        </span>
      )}
    </div>
  );
};
