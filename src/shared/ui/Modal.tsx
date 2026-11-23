import { useEffect, useId, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { focusRing } from './controls';

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
  narrow = false,
  variant = 'modal',
}: {
  title: string;
  description?: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
  /** Para formularios cortos (p. ej. registrar una incidencia). */
  narrow?: boolean;
  /** Presentación como modal centrado o drawer lateral deslizante. */
  variant?: 'modal' | 'drawer';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const isDrawer = variant === 'drawer';
  const widthClass = isDrawer
    ? wide
      ? 'w-full sm:w-[min(100vw,54rem)]'
      : narrow
        ? 'w-full sm:w-[min(100vw,28rem)]'
        : 'w-full sm:w-[min(100vw,36rem)]'
    : wide
      ? 'max-w-5xl'
      : narrow
        ? 'max-w-md'
        : 'max-w-2xl';

  return (
    <dialog
      ref={ref}
      data-variant={variant}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={
        isDrawer
          ? `m-0 ml-auto h-dvh max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-slate-900 shadow-none backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm open:flex open:flex-col ${widthClass}`
          : `m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-hidden rounded-3xl border-0 bg-transparent p-0 text-slate-900 shadow-none backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm open:flex open:flex-col ${widthClass}`
      }
    >
      <motion.div
        initial={
          isDrawer
            ? { opacity: 0.7, x: '100%' }
            : { opacity: 0, scale: 0.96, y: 10 }
        }
        animate={
          isDrawer
            ? { opacity: 1, x: 0 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.9 }}
        style={
          isDrawer
            ? { boxShadow: 'var(--shadow-drawer)' }
            : undefined
        }
        className={
          isDrawer
            ? 'flex h-dvh w-full flex-col overflow-hidden border-l border-slate-200/80 bg-white sm:rounded-l-3xl'
            : 'flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl'
        }
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-xs text-subtle sm:text-sm">
                {description}
              </p>
            )}
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            aria-label="Cerrar modal"
            className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            <X size={18} />
          </motion.button>
        </header>
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </motion.div>
    </dialog>
  );
}
