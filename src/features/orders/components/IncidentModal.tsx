import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { IncidentSeverity, IncidentType, Order } from '../../../types';
import { useApp } from '../../../context/AppContext';

interface IncidentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, createIncident, showToast } = useApp();
  const [incType, setIncType] = useState<IncidentType>('MANCHA_PERSISTENTE');
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>('MEDIA');
  const [incDesc, setIncDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incDesc.trim()) return;

    setIsSubmitting(true);
    try {
      createIncident({
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        type: incType,
        severity: incSeverity,
        description: incDesc.trim(),
        assignedTo: currentUser.name,
        reportedBy: currentUser.name,
        reportedRole: currentUser.role,
        evidences: [
          {
            id: 'EVD-' + Date.now(),
            url: '',
            caption: 'Evidencia fotográfica adjunta en recepción/procesamiento',
            uploadedAt:
              'Hoy ' +
              new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              }),
          },
        ],
      });

      showToast({
        type: 'success',
        title: 'Incidencia registrada',
        message: `Se abrió incidencia en la solicitud ${order.trackingNumber || order.id}.`,
      });
      setIncDesc('');
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
      aria-labelledby="incident-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="incident-modal-title" className="text-base font-bold text-slate-900">
                Registrar incidencia operacional
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
              Tipo de incidencia *
            </label>
            <select
              value={incType}
              onChange={(e) => setIncType(e.target.value as IncidentType)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="MANCHA_PERSISTENTE">Mancha persistente / rebelde</option>
              <option value="PRENDA_DANADA">Prenda dañada previa o en proceso</option>
              <option value="PERDIDA_PARCIAL">Pérdida o extravío parcial</option>
              <option value="DIRECCION_ERRONEA">Dirección errónea o inaccesible</option>
              <option value="CLIENTE_AUSENTE">Cliente ausente en domicilio</option>
              <option value="RETRASO_OPERACIONAL">Retraso operacional grave</option>
              <option value="OTRO">Otro motivo operacional</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Severidad operacional *
            </label>
            <select
              value={incSeverity}
              onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="BAJA">Baja (Informativa)</option>
              <option value="MEDIA">Media (Aviso al cliente)</option>
              <option value="ALTA">Alta (Requiere aprobación)</option>
              <option value="CRITICA">Crítica (Bloqueante del flujo)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Descripción detallada del caso *
            </label>
            <textarea
              value={incDesc}
              onChange={(e) => setIncDesc(e.target.value)}
              required
              rows={3}
              placeholder="Explicar qué sucedió, en qué etapa y qué medidas iniciales se tomaron..."
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
              disabled={isSubmitting || !incDesc.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Registrando...' : 'Abrir incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
