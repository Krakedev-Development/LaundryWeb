import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-full sm:max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ),
          error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
          warning: (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          ),
          info: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-200 bg-white shadow-lg',
          error: 'border-rose-200 bg-white shadow-lg',
          warning: 'border-amber-200 bg-white shadow-lg',
          info: 'border-sky-200 bg-white shadow-lg',
        };

        return (
          <div
            key={toast.id}
            role={
              toast.type === 'error' || toast.type === 'warning'
                ? 'alert'
                : 'status'
            }
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borders[toast.type]} transition-all animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#102A43]">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-[#6B7280] leading-snug">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label={`Cerrar aviso: ${toast.title}`}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
