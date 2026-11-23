import React, { useEffect, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { overlayVariants, transition } from '../motion/tokens';
import { MapPinned, X } from 'lucide-react';

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose(): void;
  children: React.ReactNode;
}) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      ref.current?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <motion.dialog
      ref={ref}
      data-present={present}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced ? { duration: 0 } : transition}
      aria-labelledby="logistics-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (present) onClose();
      }}
      className="ops-ui ops-dialog backdrop:bg-slate-900/55 backdrop:backdrop-blur-sm"
    >
      <motion.div
        variants={reduced ? undefined : overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={reduced ? { duration: 0 } : transition}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden"
      >
        <header className="ops-dialog-header">
          <span className="ops-icon">
            <MapPinned aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ops-eyebrow">Logística</p>
            <h2
              id="logistics-dialog-title"
              className="mt-1 text-base font-bold tracking-tight text-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-sky-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>
        <div className="ops-dialog-body">{children}</div>
      </motion.div>
    </motion.dialog>
  );
}
