import React, { useState } from 'react';
import { X, DollarSign, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import type { Order } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { storageService } from '../../../services/storage';
import { createAdjustment } from '../../../services/api/plantApi';

interface PaymentAdjustmentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentAdjustmentModal: React.FC<PaymentAdjustmentModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [adjustmentKind, setAdjustmentKind] = useState<'SURCHARGE' | 'DISCOUNT'>('SURCHARGE');
  const [reasonCategory, setReasonCategory] = useState<string>('EXTRA_ITEM');
  const [amountStr, setAmountStr] = useState('');
  const [internalReason, setInternalReason] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentTotal = order.pricing?.total ?? 0;
  const parsedAmount = Math.abs(Number(amountStr.replace(',', '.'))) || 0;
  const delta = adjustmentKind === 'SURCHARGE' ? parsedAmount : -parsedAmount;
  const simulatedTotal = Math.max(0, currentTotal + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Por favor ingresa un importe mayor a $0.00');
      return;
    }
    if (!internalReason.trim()) {
      setError('El motivo interno es obligatorio para auditoría.');
      return;
    }
    if (!customerMessage.trim()) {
      setError('El mensaje explicativo para el cliente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Try backend first if plant order exists
      const apiType =
        reasonCategory === 'EXTRA_ITEM'
          ? 'EXTRA_ITEM'
          : reasonCategory === 'DELICATE_CARE'
            ? 'SERVICE_RECLASSIFICATION'
            : 'PRICE_ADJUSTMENT';

      await createAdjustment(order.id, {
        type: apiType,
        internalReason: internalReason.trim(),
        customerMessage: customerMessage.trim(),
        amountDifference: delta,
        expectedVersion: order.version ?? 1,
      }).catch(() => {
        // Fallback to local business service
        storageService.businessService.proposeAdjustment(
          order.id,
          delta,
          internalReason.trim(),
          customerMessage.trim(),
        );
      });

      showToast({
        type: 'success',
        title: 'Ajuste económico registrado',
        message:
          adjustmentKind === 'SURCHARGE'
            ? `Se propuso un cargo adicional de +$${parsedAmount.toFixed(2)} al cliente.`
            : `Se aplicó un descuento de -$${parsedAmount.toFixed(2)}.`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar el ajuste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adj-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-[#0F4C81]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 id="adj-modal-title" className="text-base font-bold text-slate-900">
                Gestionar ajuste comercial
              </h2>
              <p className="text-xs text-slate-500">
                Solicitud {order.trackingNumber || order.id} · Total actual: ${currentTotal.toFixed(2)}
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
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Type selector: Positive Surcharge vs Negative Discount */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Tipo de ajuste *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentKind('SURCHARGE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  adjustmentKind === 'SURCHARGE'
                    ? 'border-[#0F4C81] bg-sky-50/60 ring-2 ring-sky-200 font-bold text-[#0F4C81]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="block text-xs">Cargo adicional (+)</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    Requiere aprobación del cliente
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentKind('DISCOUNT')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  adjustmentKind === 'DISCOUNT'
                    ? 'border-[#0F4C81] bg-sky-50/60 ring-2 ring-sky-200 font-bold text-[#0F4C81]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="block text-xs">Descuento (-)</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    Se aplica directamente
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Reason Category and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Motivo / Concepto *
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="EXTRA_ITEM">Prenda o ítem adicional</option>
                <option value="STAIN_TREATMENT">Tratamiento desmanchador especial</option>
                <option value="DELICATE_CARE">Cuidado técnico de tela fina</option>
                <option value="DELAY_DISCOUNT">Cortesía o compensación por demora</option>
                <option value="OTHER">Otro motivo operacional</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Importe del ajuste ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reconciled impact simulation preview */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Total actual del pedido:</span>
              <span>${currentTotal.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between font-bold ${
                adjustmentKind === 'SURCHARGE' ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              <span>Ajuste ({adjustmentKind === 'SURCHARGE' ? 'Cargo' : 'Descuento'}):</span>
              <span>
                {adjustmentKind === 'SURCHARGE' ? '+' : '-'}${parsedAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
              <span>Nuevo total proyectado:</span>
              <span>${simulatedTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Internal Reason */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Motivo interno (para auditoría de operaciones) *
            </label>
            <input
              type="text"
              value={internalReason}
              onChange={(e) => setInternalReason(e.target.value)}
              placeholder="Ej: Se identificó una prenda adicional de lana no declarada en el empaque"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          {/* Customer Message */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mensaje explicativo para el cliente *
            </label>
            <textarea
              rows={2}
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Ej: Estimado cliente, encontramos una prenda extra durante la recepción. Solicitamos tu confirmación para procesarla."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || parsedAmount <= 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
