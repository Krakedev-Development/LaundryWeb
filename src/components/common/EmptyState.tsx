import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Todo está bajo control',
  subtitle = 'No se encontraron registros activos para los criterios seleccionados.',
  icon,
  action,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-14'
      }`}
    >
      <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary-soft text-primary shadow-2xs">
        {icon || <CheckCircle2 className="h-6 w-6 text-primary" />}
      </div>
      <h3 className="text-sm font-bold tracking-tight text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-subtle">
        {subtitle}
      </p>
      {action && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover"
        >
          {action.label}
        </motion.button>
      )}
    </div>
  );
};
