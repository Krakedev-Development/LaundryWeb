import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MapPinned, X } from 'lucide-react';
import { focusRing } from './controls';

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose(): void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="logistics-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="ops-ui ops-dialog rounded-3xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl bg-white"
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
          <motion.button
            type="button"
            aria-label="Cerrar"
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
          >
            <X size={18} />
          </motion.button>
        </header>
        <div className="ops-dialog-body">{children}</div>
      </motion.div>
    </dialog>
  );
}
