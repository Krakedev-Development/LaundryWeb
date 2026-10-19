import React, { useEffect, useRef } from 'react';
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
      className="ops-ui ops-dialog"
    >
      <header className="ops-dialog-header">
        <span className="ops-icon">
          <MapPinned aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ops-eyebrow">Logística</p>
          <h2
            id="logistics-dialog-title"
            className="mt-1 text-base font-bold tracking-tight text-[#102A43]"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-sky-600"
        >
          <X size={18} />
        </button>
      </header>
      <div className="ops-dialog-body">{children}</div>
    </dialog>
  );
}
