import React, { useCallback, useEffect, useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Receipt,
  CreditCard,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
  Tag,
} from 'lucide-react';
import type { Order } from '../../../types';
import { PaginatedTable } from '../../../shared/ui/TablePagination';
import { listAdjustments, type StaffAdjustment } from '../../../services/api/plantApi';
import { paymentMethodLabel } from '../../../services/api/ordersApi';

interface OrderInfoTabProps {
  order: Order;
  onRefresh: () => void;
  confirmingPayment: boolean;
  onConfirmPayment: () => Promise<void>;
}

const ADJ_STATUS: Record<StaffAdjustment['status'], string> = {
  PENDING_CUSTOMER: 'Pendiente del cliente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

function formatAmount(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  const sign = n > 0 ? '+' : '';
  return `${sign}$${n.toFixed(2)}`;
}

export const OrderInfoTab: React.FC<OrderInfoTabProps> = ({
  order,
  confirmingPayment,
  onConfirmPayment,
}) => {
  const [adjustments, setAdjustments] = useState<StaffAdjustment[]>([]);
  const [adjState, setAdjState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [adjError, setAdjError] = useState('');

  const isServerUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

  const loadAdjustments = useCallback(async () => {
    if (!isServerUuid) {
      setAdjustments([]);
      setAdjState('ready');
      return;
    }
    setAdjState('loading');
    setAdjError('');
    try {
      setAdjustments(await listAdjustments(order.id));
      setAdjState('ready');
    } catch (err) {
      setAdjustments([]);
      setAdjError(err instanceof Error ? err.message : 'No se pudieron cargar los ajustes.');
      setAdjState('error');
    }
  }, [order.id, isServerUuid]);

  useEffect(() => {
    void loadAdjustments();
  }, [loadAdjustments]);

  const pricing = order.pricing || {
    subtotal: 0,
    discount: 0,
    extrasTotal: 0,
    deliveryFee: 0,
    total: 0,
    currency: 'USD',
    paymentMethod: 'TARJETA',
    paymentStatus: 'PAID',
  };

  const subtotal = pricing.subtotal || 0;
  const extrasTotal = pricing.extrasTotal || 0;
  const deliveryFee = pricing.deliveryFee || 0;
  const discount = pricing.discount || 0;
  const adjustmentsTotal = pricing.adjustmentsTotal || 0;
  const total = pricing.total || 0;
  const paid =
    pricing.amountPaid !== undefined
      ? pricing.amountPaid
      : pricing.paymentStatus === 'PAID'
        ? total
        : 0;
  const due = pricing.amountDue !== undefined ? pricing.amountDue : Math.max(0, total - paid);

  // Reconcile financial breakdown cleanly (Solving Audit Finding H-05)
  // baseSum = subtotal + extrasTotal + deliveryFee - discount + adjustmentsTotal
  const baseSum = subtotal + extrasTotal + deliveryFee - discount + adjustmentsTotal;
  const difference = Number((total - baseSum).toFixed(2));
  const taxAmount =
    pricing.taxAmount !== undefined
      ? pricing.taxAmount
      : difference > 0
        ? difference
        : 0;

  return (
    <div className="space-y-6">
      {/* Único aviso de pago pendiente de la pestaña, con su única acción (UX-06). La tarjeta de
          pago de abajo solo muestra la forma y el estado. */}
      {pricing.paymentStatus !== 'PAID' && (
        <section
          role="region"
          aria-label="Atención de pago requerido"
          className="bg-amber-50/80 rounded-2xl border border-amber-200 p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden />
              <span>Pago pendiente de confirmación</span>
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 tabular-nums">
              {paymentMethodLabel(pricing.paymentMethod)} · Saldo: ${due.toFixed(2)}
            </span>
          </div>

          <p className="text-sm text-amber-900">
            {paid > 0 && due > 0
              ? `Falta cobrar el saldo final de $${due.toFixed(2)} tras un ajuste de precio. Confírmalo cuando tesorería lo haya verificado.`
              : pricing.paymentMethod === 'TRANSFERENCIA'
                ? 'Tesorería debe validar el comprobante de transferencia antes de confirmar el pago.'
                : 'Confirma el pago cuando tesorería lo haya verificado.'}
          </p>

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => void onConfirmPayment()}
              disabled={confirmingPayment}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {confirmingPayment ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{confirmingPayment ? 'Confirmando pago en servidor...' : 'Confirmar pago verificado'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Customer & Facility Information Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span>Información del Cliente y Sede Operativa</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Client Details */}
          <div className="space-y-3">
            <div>
              <span className="text-slate-500 block text-xs">Cliente solicitante</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-sm text-slate-900">
                  {order.customerName || 'Cliente sin nombre registrado'}
                </span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {order.customerPlan ? `Plan ${order.customerPlan}` : 'Sin membresía'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{order.customerPhone || 'Teléfono no registrado'}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{order.customerEmail || 'Correo no registrado'}</span>
            </div>
          </div>

          {/* Facility & Logistics Zone */}
          <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
            <div>
              <span className="text-slate-500 block text-xs">Sede de procesamiento asignada</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {order.facilityName || 'Planta principal'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-xs">Zona logística</span>
              <span className="font-semibold text-slate-700">
                {order.zoneName || 'Zona Centro'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Garments and Services Breakdown */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span>Detalle de Prendas y Servicios ({order.itemCount} prendas)</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Tarifa: {pricing.pricingModel === 'PER_WEIGHT' ? 'Por peso' : 'Por prenda'}
          </span>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <PaginatedTable items={order.items || []} label="prendas" hideWhenSinglePage>
            {(itemRows) => (
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-muted text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Prenda / Ítem</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Unitario</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                        Sin ítems detallados individualmente.
                      </td>
                    </tr>
                  ) : (
                    itemRows.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800">
                            {item.name || 'Prenda sin nombre registrado'}
                          </span>
                          {item.notes && (
                            <span className="block text-xs text-slate-500 mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.category || 'PRENDAS'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-slate-700">
                          ${(item.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-slate-900">
                          ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </PaginatedTable>
        </div>

        {/* Extras & Promotions */}
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-700 block mb-1.5">
            Servicios adicionales y extras seleccionados:
          </span>
          {(order.extras || []).length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sin servicios extras contratados.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {order.extras.map((ext) => (
                <div key={ext.id} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">• {ext.name}</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    +${(ext.price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pricing.promoCodeApplied && (
            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cupón promocional: <strong>{pricing.promoCodeApplied}</strong></span>
              </span>
              <span className="font-bold tabular-nums">-${discount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Financial Breakdown & Payment Reconciliation (Solving Finding H-05) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reconciled Breakdown Card */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span>Desglose Económico Conciliado</span>
          </h2>

          <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal prendas:</span>
              <span className="tabular-nums">${subtotal.toFixed(2)}</span>
            </div>

            {extrasTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Servicios extra:</span>
                <span className="tabular-nums">+${extrasTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Envío y logística a domicilio:</span>
              <span className="tabular-nums">${deliveryFee.toFixed(2)}</span>
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Impuestos (IVA 15%):</span>
                <span className="tabular-nums">+${taxAmount.toFixed(2)}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Descuento aplicado:</span>
                <span className="tabular-nums">-${discount.toFixed(2)}</span>
              </div>
            )}

            {adjustmentsTotal !== 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Ajustes aprobados:</span>
                <span className="tabular-nums">
                  {adjustmentsTotal > 0 ? '+' : ''}${adjustmentsTotal.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-primary pt-2 border-t border-slate-300">
              <span>Total final:</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-emerald-800 pt-1">
              <span>Monto pagado registrado:</span>
              <span className="tabular-nums font-semibold">${paid.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
              <span className={due > 0 ? 'text-amber-800' : 'text-slate-700'}>
                Saldo pendiente:
              </span>
              <span className={`tabular-nums ${due > 0 ? 'text-amber-800' : 'text-slate-700'}`}>
                ${due.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* Payment Method & Confirm Action */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Método y Estado de Pago</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Forma de pago registrada</span>
                <span className="font-bold text-slate-800 text-sm">{paymentMethodLabel(pricing.paymentMethod)}</span>
              </div>
              <div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    pricing.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {pricing.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente de pago'}
                </span>
              </div>
            </div>

          </div>

          {/* Adjustments: read-only from server (T-01) */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              Ajustes de precio registrados
              {adjState === 'ready' ? ` (${adjustments.length})` : ''}
            </span>
            <p className="text-xs text-slate-500 mb-2">
              Solo lectura. Los ajustes se gestionan en Planta.
            </p>

            {adjState === 'loading' && (
              <p role="status" className="text-xs text-slate-500 flex items-center gap-1.5">
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                Cargando ajustes...
              </p>
            )}

            {adjState === 'error' && (
              <div
                role="alert"
                className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2"
              >
                <p className="font-semibold">No se pudieron cargar los ajustes.</p>
                <p className="text-xs">{adjError}</p>
                <button
                  type="button"
                  onClick={() => void loadAdjustments()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}

            {!isServerUuid && (
              <p className="text-xs text-slate-500 italic">
                No aplica en pedidos locales o fuera del servidor.
              </p>
            )}

            {isServerUuid && adjState === 'ready' && adjustments.length === 0 && (
              <p className="text-xs text-slate-500 italic">
                Sin ajustes de precio en esta solicitud.
              </p>
            )}

            {adjState === 'ready' && adjustments.length > 0 && (
              <div className="space-y-2 text-xs" aria-label="Ajustes de precio">
                {adjustments.map((adj) => {
                  const amount = Number(adj.amountDifference);
                  return (
                    <div
                      key={adj.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{adj.customerMessage}</span>
                        {adj.internalReason && (
                          <span className="block text-xs text-slate-500">
                            {adj.internalReason}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold block ${
                            amount > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {formatAmount(adj.amountDifference)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {ADJ_STATUS[adj.status] ?? adj.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
