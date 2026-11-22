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

  const loadAdjustments = useCallback(async () => {
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
  }, [order.id]);

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
      {/* Customer & Facility Information Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-navy" />
          <span>Información del Cliente y Sede Operativa</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Client Details */}
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 block text-[11px]">Cliente solicitante</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-sm text-slate-900">
                  {order.customerName || 'Cliente sin nombre registrado'}
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {order.customerPlan ? `Plan ${order.customerPlan}` : 'Sin membresía'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{order.customerPhone || 'Teléfono no registrado'}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{order.customerEmail || 'Correo no registrado'}</span>
            </div>
          </div>

          {/* Facility & Logistics Zone */}
          <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
            <div>
              <span className="text-slate-400 block text-[11px]">Sede de procesamiento asignada</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {order.facilityName || 'Planta principal'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Zona logística</span>
              <span className="font-semibold text-slate-700">
                {order.zoneName || 'Zona Centro'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Identificador de cliente</span>
              <span className="font-mono text-slate-500">{order.customerId}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Garments and Services Breakdown */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-navy" />
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
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
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
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.category || 'PRENDAS'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          ${(item.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
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
            <p className="text-xs text-slate-400 italic">Sin servicios extras contratados.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {order.extras.map((ext) => (
                <div key={ext.id} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">• {ext.name}</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-800">
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
              <span className="font-mono font-bold">-${discount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Financial Breakdown & Payment Reconciliation (Solving Finding H-05) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reconciled Breakdown Card */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-navy" />
            <span>Desglose Económico Conciliado</span>
          </h3>

          <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-2 font-mono text-xs">
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

            <div className="flex justify-between font-bold text-sm text-navy pt-2 border-t border-slate-300">
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
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-navy" />
            <span>Método y Estado de Pago</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 block">Forma de pago registrada</span>
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
                  {pricing.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE DE PAGO'}
                </span>
              </div>
            </div>

            {pricing.paymentStatus !== 'PAID' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>El pago aún no ha sido confirmado en tesorería.</span>
                </p>
                <button
                  onClick={() => void onConfirmPayment()}
                  disabled={confirmingPayment}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {confirmingPayment ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {confirmingPayment ? 'Confirmando pago...' : 'Confirmar pago verificado'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Adjustments: read-only from server (T-01) */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              Ajustes de precio registrados
              {adjState === 'ready' ? ` (${adjustments.length})` : ''}
            </span>
            <p className="text-[11px] text-slate-500 mb-2">
              Solo lectura. Los ajustes se gestionan en Planta.
            </p>

            {adjState === 'loading' && (
              <p role="status" className="text-xs text-slate-400 flex items-center gap-1.5">
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
                <p className="text-[11px]">{adjError}</p>
                <button
                  type="button"
                  onClick={() => void loadAdjustments()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}

            {adjState === 'ready' && adjustments.length === 0 && (
              <p className="text-xs text-slate-400 italic">
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
                          <span className="block text-[10px] text-slate-500">
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
                        <span className="text-[10px] font-semibold text-slate-400">
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
