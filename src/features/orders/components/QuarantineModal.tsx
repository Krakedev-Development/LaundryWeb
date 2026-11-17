import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Order } from '../../../types';
import { useApp } from '../../../context/AppContext';

interface QuarantineModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuarantineModal: React.FC<QuarantineModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { moveToQuarantine, showToast } = useApp();
  const [quarantineReason, setQuarantineReason] = useState(
    'Mancha química persistente en tejido delicado',
  );
  const [quarantineNotes, setQuarantineNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      moveToQuarantine(order.id, quarantineReason, quarantineNotes);
      showToast({
        type: 'success',
        title: 'Orden enviada a revisión técnica',
        message: `La solicitud ${order.trackingNumber || order.id} quedó retenida para tratamiento técnico especializado.`,
      });
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quarantine-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200">
        <div className="flex items-center justify-between pb-4 border-b border-red-100">
          <div className="flex items-center gap-2.5 text-red-700">
            <div className="p-2 rounded-xl bg-red-100 text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="quarantine-modal-title" className="text-base font-bold text-slate-900">
                Enviar lote a retención técnica
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
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Motivo de retención técnica *
            </label>
            <select
              value={quarantineReason}
              onChange={(e) => setQuarantineReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="Mancha química persistente en tejido delicado">
                Mancha química persistente en tejido delicado
              </option>
              <option value="Daño o descosido previo a lavado">
                Daño o descosido previo a lavado
              </option>
              <option value="Riesgo de desteñido / transferencia de color">
                Riesgo de desteñido / transferencia de color
              </option>
              <option value="Contaminación por agente externo">
                Contaminación por agente externo
              </option>
              <option value="Falta de etiqueta de composición textil">
                Falta de etiqueta de composición textil
              </option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Instrucciones técnicas de revisión
            </label>
            <textarea
              value={quarantineNotes}
              onChange={(e) => setQuarantineNotes(e.target.value)}
              rows={3}
              placeholder="Detallar condiciones encontradas y acciones preventivas..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar retención'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
