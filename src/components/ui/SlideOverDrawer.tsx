import { useEffect, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { focusRing } from '../../shared/ui/controls';

interface SlideOverDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const WIDTH_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

/** Right-side slide-over drawer with spring physics and backdrop blur. */
export function SlideOverDrawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: SlideOverDrawerProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.9 }}
            style={{ boxShadow: 'var(--shadow-drawer)' }}
            className={`relative z-10 flex h-dvh w-full ${WIDTH_CLASS[size]} flex-col overflow-hidden rounded-l-3xl border-l border-slate-200/80 bg-white`}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/70 px-6 py-5">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-lg font-bold tracking-tight text-ink"
                >
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-xs text-subtle">
                    {description}
                  </p>
                )}
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Cerrar panel"
                className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
              >
                <X className="size-4" aria-hidden="true" />
              </motion.button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
