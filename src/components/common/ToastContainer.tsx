import { transition } from '../../shared/motion/tokens';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { focusRing } from '../../shared/ui/controls';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 flex flex-col gap-2.5 sm:left-auto sm:w-full sm:max-w-sm pointer-events-none">
      <AnimatePresence initial={false}>
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
            success:
              'border-emerald-200/90 bg-white/95 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-500/10',
            error:
              'border-rose-200/90 bg-white/95 shadow-xl shadow-rose-950/5 ring-1 ring-rose-500/10',
            warning:
              'border-amber-200/90 bg-white/95 shadow-xl shadow-amber-950/5 ring-1 ring-amber-500/10',
            info: 'border-sky-200/90 bg-white/95 shadow-xl shadow-sky-950/5 ring-1 ring-sky-500/10',
          };

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 12, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.98 }}
              transition={transition}
              role={
                toast.type === 'error' || toast.type === 'warning'
                  ? 'alert'
                  : 'status'
              }
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md ${borders[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-0.5 text-xs text-slate-600 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label={`Cerrar aviso: ${toast.title}`}
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${focusRing}`}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
