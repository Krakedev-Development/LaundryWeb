import React, { useEffect, useRef } from 'react';
import { Toaster, toast as sonnerToast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { focusRing } from '../../shared/ui/controls';
import { AnimatedCheckmark } from '../ui/AnimatedCheckmark';
import { AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  const activeIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));

    for (const id of Array.from(activeIds.current)) {
      if (!currentIds.has(id)) {
        sonnerToast.dismiss(id);
        activeIds.current.delete(id);
      }
    }

    for (const toast of toasts) {
      if (activeIds.current.has(toast.id)) continue;
      activeIds.current.add(toast.id);
      const persistent = toast.type === 'error' || toast.type === 'warning';

      const icons = {
        success: <AnimatedCheckmark size={20} className="text-emerald-600" />,
        error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />,
        warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />,
        info: <Info className="h-5 w-5 shrink-0 text-sky-600" />,
      };

      const borders = {
        success:
          'border-emerald-200/90 bg-white/95 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-500/10',
        error:
          'border-rose-200/90 bg-white/95 shadow-xl shadow-rose-950/5 ring-1 ring-rose-500/10',
        warning:
          'border-amber-200/90 bg-white/95 shadow-xl shadow-amber-950/5 ring-1 ring-amber-500/10',
        info: 'border-sky-200/90 bg-white/95 shadow-xl shadow-sky-950/5 ring-1 ring-sky-500/10',
      };

      sonnerToast.custom(
        (toastId) => (
          <div
            role={persistent ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 backdrop-blur-md ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                sonnerToast.dismiss(toastId);
                dismissToast(toast.id);
              }}
              aria-label={`Cerrar aviso: ${toast.title}`}
              className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ),
        {
          id: toast.id,
          duration: persistent ? Infinity : 4500,
          onDismiss: () => dismissToast(toast.id),
          onAutoClose: () => dismissToast(toast.id),
        },
      );
    }
  }, [toasts, dismissToast]);

  return (
    <Toaster
      position="bottom-right"
      visibleToasts={4}
      gap={10}
      toastOptions={{ unstyled: true, className: 'w-full sm:w-[360px]' }}
    />
  );
};
