import { operationalStage } from '../../services/fulfillment';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface OverrideModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({ order, isOpen, onClose }) => {
  const { currentUser, updateOrderStatus } = useApp();
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('READY_FOR_DELIVERY');
  const [reason, setReason] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'CREATED', label: 'Nueva' },
    { value: 'PICKUP_PENDING', label: 'Sin asignar (Recogida)' },
    { value: 'PICKUP_ASSIGNED', label: 'Asignada (Recogida)' },
    { value: 'PICKED_UP', label: 'Recogida' },
    { value: 'AT_FACILITY', label: 'Recibida en planta' },
    { value: 'IN_PROCESS', label: 'En procesamiento' },
    { value: 'QUALITY_CONTROL', label: 'Control de calidad' },
    { value: 'READY_FOR_DELIVERY', label: 'Lista para entrega' },
    { value: 'DELIVERY_SCHEDULED', label: 'Entrega programada' },
    { value: 'DELIVERY_ASSIGNED', label: 'Chofer asignado (Entrega)' },
    { value: 'OUT_FOR_DELIVERY', label: 'En entrega' },
    { value: 'DELIVERED', label: 'Entregada' },
    { value: 'CLOSED', label: 'Finalizada' },
    { value: 'QUARANTINE', label: 'Inscidencia' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('El motivo del override excepcional es estrictamente obligatorio.');
      return;
    }
    setError('');
    const success = updateOrderStatus(order.id, targetStatus, comments, true, reason);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-red-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-red-950">
                Override Excepcional de Estado
              </h2>
              <p className="text-xs text-red-700">
                Exclusivo para rol Administrador con registro en Auditoría
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-red-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Advertencia de cumplimiento:</strong> Saltar estados sin seguir el flujo operacional
              estándar genera un registro de auditoría irrevocable con tu usuario (
              <strong>{currentUser.name}</strong>) y marca de tiempo.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Solicitud
            </label>
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700">
              {order.id} · Estado actual: {operationalStage(order)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nuevo estado forzado *
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Motivo obligatorio del Override *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Autorización manual por gerencia de operaciones"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Comentarios y detalles adicionales
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              placeholder="Explicación técnica detallada para el historial..."
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Aplicar Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
