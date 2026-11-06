import { useEffect, useId, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
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
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-transparent p-0 text-slate-900 shadow-none backdrop:bg-slate-900/55 backdrop:backdrop-blur-sm open:flex open:flex-col ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-[#0F4C81]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-sky-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </header>
        <div className="relative min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </motion.div>
    </dialog>
  );
}
