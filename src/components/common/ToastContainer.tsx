import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              role={
                toast.type === 'error' || toast.type === 'warning'
                  ? 'alert'
                  : 'status'
              }
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md ${borders[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#102A43]">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-0.5 text-xs text-slate-600 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label={`Cerrar aviso: ${toast.title}`}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
