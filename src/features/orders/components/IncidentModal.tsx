import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Order } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  createIncident,
  INCIDENT_SEVERITY_LABEL,
  upsertIncident,
  type ServerIncidentSeverity,
} from '../../../services/api/incidentsApi';

interface IncidentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Abre con "Retener la solicitud" marcado (retención para revisión técnica). */
  defaultHold?: boolean;
  /**
   * Si es false, oculta la casilla de retención y nunca envía holdOrder.
   * Default true (compatible hacia atrás). Usado por el detalle en etapas de planta (T-08d / T-07).
   */
  allowHold?: boolean;
}

const TYPES: { value: string; label: string }[] = [
  { value: 'MANCHA_PERSISTENTE', label: 'Mancha persistente' },
  { value: 'PRENDA_DANADA', label: 'Prenda dañada previa o en proceso' },
  { value: 'PERDIDA_PARCIAL', label: 'Pérdida o discrepancia de prendas' },
  { value: 'DIRECCION_ERRONEA', label: 'Dirección errónea o inaccesible' },
  { value: 'CLIENTE_AUSENTE', label: 'Cliente ausente' },
  { value: 'RETRASO_OPERACIONAL', label: 'Retraso operacional o falla de vehículo' },
  { value: 'OTRO', label: 'Otro motivo' },
];

const SEVERITIES: { value: ServerIncidentSeverity; hint: string }[] = [
  { value: 'LOW', hint: 'informativa' },
  { value: 'MEDIUM', hint: 'aviso al cliente' },
  { value: 'HIGH', hint: 'requiere decisión' },
  { value: 'CRITICAL', hint: 'bloquea el flujo' },
];

// Registra la incidencia en el servidor. Si se retiene, la solicitud queda en INCIDENT y vuelve
// a su etapa al resolverse desde Incidencias.
export const IncidentModal: React.FC<IncidentModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
  defaultHold = false,
  allowHold = true,
}) => {
  const { showToast } = useApp();
  const [type, setType] = useState(TYPES[0].value);
  const [severity, setSeverity] = useState<ServerIncidentSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [holdOrder, setHoldOrder] = useState(allowHold && defaultHold);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;
  const label = order.trackingNumber || order.id;
  const willHold = allowHold && holdOrder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const created = await createIncident({
        orderId: order.id,
        type,
        severity,
        description: description.trim(),
        holdOrder: willHold,
      });
      upsertIncident(created);
      showToast({
        type: 'success',
        title: 'Incidencia registrada',
        message: willHold
          ? `La solicitud ${label} queda retenida hasta resolver la incidencia.`
          : `Se abrió una incidencia en la solicitud ${label}.`,
      });
      setDescription('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la incidencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-rose-100 pb-4">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="incident-modal-title" className="text-base font-bold text-slate-900">
                {defaultHold ? 'Retener solicitud para revisión' : 'Registrar incidencia operacional'}
              </h2>
              <p className="text-xs text-slate-500">Solicitud {label}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <label className="block font-bold text-slate-700">
            Tipo de incidencia *
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-normal"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block font-bold text-slate-700">
            Severidad *
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ServerIncidentSeverity)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-normal"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {INCIDENT_SEVERITY_LABEL[s.value]} ({s.hint})
                </option>
              ))}
            </select>
          </label>

          <label className="block font-bold text-slate-700">
            Descripción del caso *
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={1000}
              rows={3}
              placeholder="Qué sucedió, en qué etapa y qué medidas iniciales se tomaron"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-normal"
            />
          </label>

          {allowHold ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <input
                type="checkbox"
                checked={holdOrder}
                onChange={(e) => setHoldOrder(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-bold">Retener la solicitud</span>
                La solicitud no avanza hasta resolver la incidencia y luego vuelve a su etapa actual.
              </span>
            </label>
          ) : null}

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando...' : 'Abrir incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
