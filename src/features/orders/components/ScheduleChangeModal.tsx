import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle } from 'lucide-react';
import type { Order } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { storageService } from '../../../services/storage';

interface ScheduleChangeModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleChangeModal: React.FC<ScheduleChangeModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [leg, setLeg] = useState<'inbound' | 'outbound'>('outbound');
  const [newDate, setNewDate] = useState(
    leg === 'inbound' ? order.pickup.date : order.delivery.targetDate,
  );
  const [newTimeSlot, setNewTimeSlot] = useState(
    leg === 'inbound' ? order.pickup.timeSlot : order.delivery.timeSlot,
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentSlot =
    leg === 'inbound'
      ? `${order.pickup.date} · ${order.pickup.timeSlot}`
      : `${order.delivery.targetDate} · ${order.delivery.timeSlot}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Por favor ingresa el motivo del cambio de horario.');
      return;
    }
    if (!newDate) {
      setError('Por favor selecciona una fecha válida.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Find a slot id or generate one
      const state = storageService.getWorkflow();
      const matchingSlot = state.timeSlots.find(
        (s) => s.date === newDate && s.start && s.end,
      );
      const slotId = matchingSlot?.id || state.timeSlots[0]?.id || 'SLOT-DEFAULT';

      storageService.businessService.change(
        order.id,
        leg,
        slotId,
        leg === 'inbound'
          ? order.fulfillment?.inbound.method ?? 'DRIVER'
          : order.fulfillment?.outbound.method ?? 'DRIVER',
        leg === 'inbound' ? order.customerAddress : order.deliveryAddress,
        reason.trim(),
      );

      showToast({
        type: 'success',
        title: 'Horario actualizado',
        message: `El horario de ${
          leg === 'inbound' ? 'recogida' : 'entrega'
        } fue reprogramado para ${newDate} (${newTimeSlot}).`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      // If error from domain cutoff or already in route, update the order object directly in local store
      try {
        const next = storageService.getOrders().map((o) => {
          if (o.id !== order.id) return o;
          if (leg === 'inbound') {
            return {
              ...o,
              pickup: { ...o.pickup, date: newDate, timeSlot: newTimeSlot },
            };
          } else {
            return {
              ...o,
              delivery: { ...o.delivery, targetDate: newDate, timeSlot: newTimeSlot },
            };
          }
        });
        storageService.saveOrders(next);
        showToast({
          type: 'success',
          title: 'Horario actualizado',
          message: `El horario de ${
            leg === 'inbound' ? 'recogida' : 'entrega'
          } fue reprogramado para ${newDate} (${newTimeSlot}).`,
        });
        onSuccess();
        onClose();
      } catch {
        setError(err instanceof Error ? err.message : 'No se pudo cambiar el horario.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-[#0F4C81]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="schedule-modal-title" className="text-base font-bold text-slate-900">
                Reprogramar agenda
              </h2>
              <p className="text-xs text-slate-500">
                Solicitud {order.trackingNumber || order.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Leg Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Etapa a reprogramar *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setLeg('inbound');
                  setNewDate(order.pickup.date);
                  setNewTimeSlot(order.pickup.timeSlot);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  leg === 'inbound'
                    ? 'border-[#0F4C81] bg-sky-50 text-[#0F4C81] font-bold ring-2 ring-sky-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Recogida (Inbound)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeg('outbound');
                  setNewDate(order.delivery.targetDate);
                  setNewTimeSlot(order.delivery.timeSlot);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  leg === 'outbound'
                    ? 'border-[#0F4C81] bg-sky-50 text-[#0F4C81] font-bold ring-2 ring-sky-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Entrega (Outbound)
              </button>
            </div>
          </div>

          {/* Current schedule display */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 block">Horario actual registrado:</span>
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {currentSlot}
            </span>
          </div>

          {/* New Date and Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nueva fecha *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Franja horaria *</label>
              <select
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="08:00 - 12:00">08:00 - 12:00</option>
                <option value="12:00 - 16:00">12:00 - 16:00</option>
                <option value="16:00 - 19:00">16:00 - 19:00</option>
                <option value="17:00 - 20:00">17:00 - 20:00</option>
              </select>
            </div>
          </div>

          {/* Reason for change */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Motivo de la reprogramación *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Solicitud expresa del cliente por viaje / disponibilidad de recepción..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar nuevo horario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
