import React, { useEffect, useRef, useState } from 'react';
import { Check, Info, LoaderCircle, Truck, UserRound, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Order } from '../../types';
import { useDriverCandidates } from '../maps/useDriverCandidates';
import { geoConfig } from '../../services/geo/geo.config';
import { DriverCandidateCard } from './DriverCandidateCard';

export const AssignDriverModal = ({
  order,
  type,
  isOpen,
  onClose,
}: {
  order: Order;
  type: 'pickup' | 'delivery';
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { drivers, assignDriver } = useApp();
  const { candidates, loading, error } = useDriverCandidates(
    isOpen ? order : undefined,
    type,
  );
  const [selected, setSelected] = useState(''),
    [notes, setNotes] = useState('');
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    setSelected('');
    setNotes('');
  }, [order.id, type, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, textarea',
        ) ?? [],
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const selectedDriver = drivers.find((driver) => driver.id === selected);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Asignar chofer"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0F4C81] text-white">
            <Truck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Asignación de chofer
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#102A43]">
              Asignar {type === 'pickup' ? 'recogida' : 'entrega'}{' '}
              <span className="text-slate-400">·</span> {order.id}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{order.customerName}</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="sidebar-focus flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {geoConfig.mode === 'demo' && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              Tiempos y distancias de demostración.
            </p>
          )}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Choferes disponibles
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {candidates.length}
            </span>
          </div>
          {loading && (
            <p
              role="status"
              className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"
            >
              <LoaderCircle
                className="size-5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Calculando mejores choferes…
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
            >
              {error}
            </p>
          )}
          {!loading && !error && !candidates.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <UserRound
                className="mx-auto mb-2 size-7 text-slate-400"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-600">
                No hay choferes elegibles con una ruta disponible.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {candidates.map((candidate, i) => {
              const driver = drivers.find((d) => d.id === candidate.driverId)!;
              return (
                <DriverCandidateCard
                  key={driver.id}
                  driver={driver}
                  candidate={candidate}
                  recommended={i === 0}
                  selected={selected === driver.id}
                  onSelect={() => setSelected(driver.id)}
                />
              );
            })}
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Notas <span className="font-normal text-slate-400">(opcional)</span>
            <textarea
              rows={3}
              placeholder="Indicaciones para el chofer o la recogida"
              className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F4C81] focus:bg-white focus:ring-2 focus:ring-[#0F4C81]/10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">
            {selectedDriver ? (
              <>
                <span className="block text-[10px] uppercase tracking-wide">
                  Chofer seleccionado
                </span>
                <strong className="font-semibold text-[#102A43]">
                  {selectedDriver.name}
                </strong>
              </>
            ) : (
              'Selecciona un chofer para continuar.'
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="sidebar-focus rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                !candidates.some((c) => c.driverId === selected) || loading
              }
              className="sidebar-focus flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0A3660] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              onClick={() => {
                if (assignDriver(order.id, selected, type, notes)) onClose();
              }}
            >
              <Check className="size-4" aria-hidden="true" />
              Confirmar asignación
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
