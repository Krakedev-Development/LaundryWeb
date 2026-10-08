import React, { useState } from 'react';
import {
  Scale,
  ClipboardCheck,
  CalendarDays,
  Receipt,
  ArrowRight,
  Info,
  MessageSquare,
  Route,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { MODE_LABELS, nextAction } from '../../services/BusinessService';
import type { Order } from '../../types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
const buttonClass =
  'rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A3660] disabled:opacity-40';
export function OrderBusinessPanel({ order }: { order: Order }) {
  const { currentUser, showToast } = useApp();
  const state = storageService.getWorkflow(),
    service = storageService.businessService;
  const [weight, setWeight] = useState('22.5'),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState(''),
    [message, setMessage] = useState('');
  const [slotId, setSlotId] = useState(''),
    [leg, setLeg] = useState<'inbound' | 'outbound'>(
      order.pickupNeedsScheduling ? 'inbound' : 'outbound',
    ),
    [method, setMethod] = useState<'DRIVER' | 'CUSTOMER'>(
      order.pickupNeedsScheduling
        ? 'DRIVER'
        : order.fulfillment!.outbound.method,
    );
  const [chat, setChat] = useState('');
  const run = (work: () => unknown) => {
    try {
      work();
      showToast({ type: 'success', title: 'Operación guardada' });
    } catch (e) {
      showToast({
        type: 'error',
        title: 'No se pudo completar',
        message: e instanceof Error ? e.message : 'Revisa los datos.',
      });
    }
  };
  const demo = () =>
    storageService.demoBusinessActor({
      id: order.customerId,
      role: 'CLIENT',
      name: order.customerName,
    });
  const adjustments = state.adjustments.filter((a) => a.orderId === order.id),
    payments = state.payments.filter((p) => p.orderId === order.id),
    changes = state.changes.filter((c) => c.orderId === order.id);
  const context =
    leg === 'inbound'
      ? 'DRIVER_PICKUP'
      : method === 'DRIVER'
        ? 'DRIVER_DELIVERY'
        : 'FACILITY_PICKUP';
  const slots = service.availableSlots(order.facilityId, context);
  return (
    <section className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#0A3660] text-white px-6 py-5 flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Flujo y próximos pasos</h2>
          <p className="text-blue-100 text-sm mt-1">
            {MODE_LABELS[order.fulfillment!.mode]}
          </p>
        </div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
          {nextAction(order, state)}
        </div>
      </div>
      <div className="p-6 space-y-6">
        {order.pickupNeedsScheduling && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Confirma la dirección y una nueva franja de recogida a domicilio. El
            ingreso pendiente del cliente en sede se retiró y no tiene una
            recogida asignada.
          </p>
        )}
        {order.legacyInbound?.status === 'COMPLETED' && (
          <p className="text-sm text-slate-600">
            La recepción anterior del cliente en sede se conserva como
            constancia histórica. El pedido continúa desde su etapa actual.
          </p>
        )}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            [
              'Tarifa',
              order.pricing.pricingModel === 'PER_WEIGHT'
                ? `Por peso · $${order.pricing.pricePerWeightUnit}/${order.pricing.weightUnit}`
                : 'Por prenda',
            ],
            [
              'Peso',
              order.pricing.measuredWeight
                ? `${order.pricing.measuredWeight} ${order.pricing.weightUnit}`
                : 'Sin pesaje',
            ],
            [
              'Importe',
              order.pricing.amountKnown === false
                ? 'Pendiente de pesaje'
                : `$${order.pricing.total.toFixed(2)}`,
            ],
            [
              'Pago',
              order.pricing.paymentStatus === 'PAID'
                ? 'Pagado'
                : order.pricing.amountKnown === false
                  ? 'Pendiente de importe'
                  : `Pendiente: $${(order.pricing.amountDue ?? order.pricing.total).toFixed(2)}`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-slate-50 p-4 border border-slate-100"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        {order.policyReview && (
          <p className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <Info size={18} />
            {order.policyReview}
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex gap-2 items-center">
              <Scale size={18} />
              Pesaje e inspección
            </h3>
            <p className="text-xs text-slate-500">
              Requiere ingreso físico confirmado. El peso no puede declararse
              desde el cliente.
            </p>
            {order.pricing.pricingModel === 'PER_WEIGHT' && (
              <div className="flex gap-2">
                <input
                  aria-label="Peso real"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <button
                  className={buttonClass}
                  onClick={() =>
                    run(() =>
                      service.weigh(
                        order.id,
                        Number(weight),
                        order.pricing.weightUnit ?? 'LB',
                      ),
                    )
                  }
                >
                  Registrar {order.pricing.weightUnit}
                </button>
              </div>
            )}
            <textarea
              className={inputClass}
              placeholder="Mensaje visible para el cliente"
              aria-label="Mensaje de inspección"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() => run(() => service.inspect(order.id, message))}
            >
              <ClipboardCheck size={16} className="inline mr-2" />
              Confirmar inspección
            </button>
            {state.incidents.some(
              (i) =>
                i.orderId === order.id &&
                i.type === 'CLIENTE_AUSENTE' &&
                i.status !== 'RESOLVED',
            ) && (
              <button
                className={buttonClass}
                onClick={() =>
                  run(() =>
                    storageService.businessService.resolveFailedPickup(
                      order.id,
                      reason,
                      message,
                    ),
                  )
                }
              >
                Resolver recogida fallida y habilitar nueva agenda
              </button>
            )}
          </div>
          <div className="border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex gap-2 items-center">
              <Receipt size={18} />
              Ajustes sobre el mismo pedido
            </h3>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              aria-label="Importe del ajuste"
              placeholder="Importe positivo o descuento negativo"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className={inputClass}
              aria-label="Motivo interno del ajuste"
              placeholder="Motivo interno (no se muestra al cliente)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() =>
                run(() =>
                  service.proposeAdjustment(
                    order.id,
                    Number(amount),
                    reason,
                    message,
                  ),
                )
              }
            >
              Proponer ajuste
            </button>
            <p className="text-xs text-slate-500">
              Utiliza el mensaje de inspección para explicar el ajuste al
              cliente.
            </p>
            {adjustments.map((a) => (
              <div key={a.id} className="border-t pt-3 text-sm">
                <p className="font-semibold">
                  ${a.amount.toFixed(2)} · {a.status}
                </p>
                <p>{a.customerMessage}</p>
                {currentUser.role === 'ADMIN' && a.status === 'PENDING' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className={buttonClass}
                      onClick={() =>
                        run(() => demo().decideAdjustment(a.id, true))
                      }
                    >
                      MVP: cliente acepta
                    </button>
                    <button
                      className="text-rose-700 underline"
                      onClick={() =>
                        run(() => demo().decideAdjustment(a.id, false))
                      }
                    >
                      MVP: cliente rechaza
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['IN_PROCESS', 'QUALITY_CONTROL', 'READY'] as const).map(
            (target, index) => (
              <button
                key={target}
                className={buttonClass}
                onClick={() => run(() => service.process(order.id, target))}
              >
                {
                  [
                    'Iniciar procesamiento',
                    'Control de calidad',
                    'Marcar listo',
                  ][index]
                }
                <ArrowRight size={16} className="inline ml-2" />
              </button>
            ),
          )}
          {currentUser.role === 'ADMIN' &&
            order.pricing.paymentStatus !== 'PAID' &&
            order.pricing.amountKnown !== false && (
              <button
                className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800"
                onClick={() =>
                  run(() => demo().pay(order.id, crypto.randomUUID()))
                }
              >
                MVP: simular pago del cliente
              </button>
            )}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="flex gap-2 font-semibold">
              <CalendarDays size={18} />
              Agenda y cambios
            </h3>
            <p className="text-sm">
              Entrada: {order.fulfillment!.inbound.date} ·{' '}
              {order.fulfillment!.inbound.timeSlot}
            </p>
            <p className="text-sm">
              Salida: {order.fulfillment!.outbound.date || 'Al estar listo'} ·{' '}
              {order.fulfillment!.outbound.timeSlot}
            </p>
            {currentUser.role === 'ADMIN' && (
              <>
                <p className="text-xs text-slate-500">
                  Simulación del cliente en esta instalación del MVP.
                </p>
                <select
                  className={inputClass}
                  aria-label="Tramo a modificar"
                  value={leg}
                  onChange={(e) => {
                    setLeg(e.target.value as typeof leg);
                    setMethod(
                      e.target.value === 'inbound'
                        ? 'DRIVER'
                        : order.fulfillment!.outbound.method,
                    );
                    setSlotId('');
                  }}
                >
                  <option value="inbound">Entrada</option>
                  <option value="outbound">Salida</option>
                </select>
                <select
                  className={inputClass}
                  value={method}
                  aria-label="Método nuevo"
                  onChange={(e) => {
                    setMethod(e.target.value as typeof method);
                    setSlotId('');
                  }}
                >
                  <option value="DRIVER">Domicilio</option>
                  {leg === 'outbound' && (
                    <option value="CUSTOMER">Pick up · retiro en sede</option>
                  )}
                </select>
                <select
                  className={inputClass}
                  aria-label="Franja nueva"
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                >
                  <option value="">Seleccionar franja</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} · {s.start}–{s.end} ·{' '}
                      {s.capacity - s.reservedCount} cupos
                    </option>
                  ))}
                </select>
                <button
                  className={buttonClass}
                  onClick={() =>
                    run(() =>
                      demo().change(
                        order.id,
                        leg,
                        slotId,
                        method,
                        leg === 'inbound'
                          ? order.customerAddress
                          : order.deliveryAddress,
                        reason,
                      ),
                    )
                  }
                >
                  MVP: solicitar cambio
                </button>
                <button
                  className="ml-3 text-rose-700 text-sm"
                  onClick={() => run(() => demo().cancel(order.id, reason))}
                >
                  MVP: cancelar
                </button>
              </>
            )}
            <p className="text-xs text-slate-500">
              Cambios registrados: {changes.length}. Los cambios revocan los
              códigos anteriores sin usar.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="flex gap-2 font-semibold">
              <MessageSquare size={18} />
              Chat con operaciones
            </h3>
            <div className="max-h-40 overflow-auto space-y-2">
              {state.messages
                .filter(
                  (m) => m.orderId === order.id && m.channel === 'OPERATIONS',
                )
                .map((m) => (
                  <p key={m.id} className="text-sm bg-slate-50 rounded-lg p-2">
                    {m.senderId === order.customerId
                      ? 'Cliente'
                      : 'Operaciones'}
                    : {m.text}
                  </p>
                ))}
            </div>
            <input
              className={inputClass}
              aria-label="Mensaje para cliente"
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              placeholder="Mensaje para el cliente"
            />
            <button
              className={buttonClass}
              onClick={() =>
                run(() => {
                  service.sendMessage(order.id, 'OPERATIONS', chat);
                  setChat('');
                })
              }
            >
              Enviar mensaje
            </button>
            <h3 className="flex gap-2 font-semibold pt-2">
              <Route size={18} />
              Pagos y paradas
            </h3>
            {payments.map((p) => (
              <p key={p.id} className="text-xs text-slate-600">
                {p.at} · ${p.amount.toFixed(2)} · {p.method} · Demo local
              </p>
            ))}
            {state.routeStops
              .filter((s) => s.orderId === order.id)
              .map((s) => (
                <p key={s.id} className="text-xs text-slate-600">
                  {s.leg === 'inbound' ? 'Recogida' : 'Entrega'} · {s.driverId}{' '}
                  · {s.status}
                </p>
              ))}
          </div>
        </div>
        {state.charges
          .filter((c) => c.orderId === order.id)
          .map((c) => (
            <div key={c.id} className="bg-amber-50 rounded-xl p-4 text-sm">
              Cargo ${c.amount.toFixed(2)} · {c.reason} · {c.status}
              {currentUser.role === 'ADMIN' && c.status === 'PENDING' && (
                <button
                  className="ml-3 underline"
                  onClick={() =>
                    run(() => service.settleCharge(c.id, true, reason))
                  }
                >
                  Exonerar con motivo
                </button>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
