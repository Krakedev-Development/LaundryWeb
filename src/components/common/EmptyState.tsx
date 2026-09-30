import React from 'react';
import { CheckCircle2, Inbox } from 'lucide-react';

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
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[#E5EAF0] bg-white/60 ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-[#E8EEF5] text-[#143F73] flex items-center justify-center mb-3">
        {icon || <CheckCircle2 className="w-6 h-6 text-[#143F73]" />}
      </div>
      <h3 className="text-sm font-semibold text-[#102A43]">{title}</h3>
      <p className="mt-1 text-xs text-[#6B7280] max-w-sm">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#143F73] hover:bg-[#0F315A] rounded-lg transition-colors shadow-xs"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
