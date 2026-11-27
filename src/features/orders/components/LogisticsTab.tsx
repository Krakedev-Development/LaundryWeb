import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveriesHref, dispatchHref } from '../../../services/operationsLinks';
import {
  MapPin,
  Truck,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { Order } from '../../../types';
import { operationalStage } from '../../../services/fulfillment';
import {
  canAssignDelivery,
  canAssignPickup,
  deliveryNote,
  isDeliveryCompleted as isDeliveryDone,
  isInPlant,
  isPickupCompleted as isPickupDone,
  isStorePickup,
  pickupNote,
} from '../model/orderDisplay';
import { OrderRouteMap } from '../../../components/maps/OrderRouteMap';

interface LogisticsTabProps {
  order: Order;
}

export const LogisticsTab: React.FC<LogisticsTabProps> = ({ order }) => {
  const stage = operationalStage(order);

  // Mismas reglas que la lista de Solicitudes (model/orderDisplay).
  const isPickupCompleted = isPickupDone(order);

  const isPickupInRoute = stage === 'HEADING_TO_PICKUP' || stage === 'ARRIVED_FOR_PICKUP';
  const isPickupAssigned = Boolean(order.pickup.driverId) || stage === 'PICKUP_ASSIGNED';

  const pickupStatusLabel = isPickupCompleted
    ? 'Completada'
    : isPickupInRoute
      ? 'En camino'
      : isPickupAssigned
        ? 'Asignada'
        : 'Pendiente de asignación';

  // Determine actual delivery status
  const isDeliveryDelivered = isDeliveryDone(order);
  const isDeliveryInRoute = stage === 'OUT_FOR_DELIVERY' || stage === 'ARRIVED_FOR_DELIVERY';
  const isDeliveryAssigned = Boolean(order.delivery.driverId) || stage === 'DELIVERY_ASSIGNED';
  const isDeliveryReady = ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'].includes(stage);

  const deliveryStatusLabel = isDeliveryDelivered
    ? 'Entregada'
    : isDeliveryInRoute
      ? 'En reparto'
      : isDeliveryAssigned
        ? 'Chofer asignado'
        : isDeliveryReady
          ? isStorePickup(order)
            ? 'Listo para retiro'
            : 'Lista para entrega'
          : isInPlant(order)
            ? 'En planta'
            : isStorePickup(order)
              ? 'Retiro programado'
              : 'Entrega programada';

  // Selector Recogida / Entrega (por defecto la etapa activa)
  const [selectedLeg, setSelectedLeg] = useState<'pickup' | 'delivery'>(() =>
    isPickupCompleted ? 'delivery' : 'pickup',
  );

  // Evitar repetir la dirección como nota (UX-09)
  const pickupAddressNormalized =
    `${order.customerAddress.street} ${order.customerAddress.number} ${order.customerAddress.neighborhood}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const pickupNoteNormalized = (order.pickup.notes || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const showPickupNote =
    Boolean(order.pickup.notes) &&
    pickupNoteNormalized.length > 0 &&
    !pickupAddressNormalized.includes(pickupNoteNormalized);

  const deliveryAddressNormalized =
    `${order.deliveryAddress.street} ${order.deliveryAddress.number} ${order.deliveryAddress.neighborhood}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const deliveryNoteNormalized = (order.delivery.notes || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const showDeliveryNote =
    Boolean(order.delivery.notes) &&
    deliveryNoteNormalized.length > 0 &&
    !deliveryAddressNormalized.includes(deliveryNoteNormalized);

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout: Info 5/12, Map 7/12 (UX-09) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leg Selector & Information Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Leg Selector Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setSelectedLeg('pickup')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedLeg === 'pickup'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>1. Recogida</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isPickupCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isPickupCompleted ? 'Lista' : 'En curso'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedLeg('delivery')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedLeg === 'delivery'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>2. Entrega</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isDeliveryDelivered
                    ? 'bg-emerald-100 text-emerald-800'
                    : isDeliveryReady || isDeliveryInRoute
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isDeliveryDelivered ? 'Lista' : 'Programada'}
              </span>
            </button>
          </div>

          {/* Active Leg Card */}
          {selectedLeg === 'pickup' ? (
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" aria-hidden />
                  <span>Logística de Recogida</span>
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isPickupCompleted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isPickupInRoute
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {pickupStatusLabel}
                </span>
              </div>

              <div className="space-y-3.5 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Fecha y franja horaria</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {order.pickup.date} · {order.pickup.timeSlot}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Dirección de recogida</span>
                  <span className="font-medium text-slate-700 block mt-0.5">
                    {order.customerAddress.street} #{order.customerAddress.number},{' '}
                    {order.customerAddress.neighborhood}
                  </span>
                  {order.customerAddress.reference && (
                    <span className="text-xs text-slate-500 italic block mt-0.5">
                      Ref: {order.customerAddress.reference}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Conductor asignado</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {order.pickup.driverName
                      ? `${order.pickup.driverName} (${order.pickup.vehiclePlate || 'Vehículo asignado'})`
                      : pickupNote(order).text}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    {isPickupCompleted
                      ? 'Custodia verificada y registrada en planta.'
                      : 'Custodia pendiente de retiro en el domicilio.'}
                  </span>
                </div>

                {showPickupNote && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    Instrucción especial: {order.pickup.notes}
                  </p>
                )}

                {/* La recogida se asigna solo en Despacho; aquí solo se navega hasta allí. */}
                {canAssignPickup(order) && (
                  <Link
                    to={dispatchHref(order.id)}
                    className="block w-full mt-2 py-2.5 text-center text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors"
                  >
                    Asignar en Despacho
                  </Link>
                )}
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-600" aria-hidden />
                  <span>Logística de Entrega</span>
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isDeliveryDelivered
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isDeliveryInRoute
                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                        : isDeliveryAssigned
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {deliveryStatusLabel}
                </span>
              </div>

              <div className="space-y-3.5 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">
                    Fecha objetivo y franja horaria
                  </span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {order.delivery.targetDate} · {order.delivery.timeSlot}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Destinatario de entrega</span>
                  <span className="font-medium text-slate-700 block mt-0.5">
                    {order.delivery.recipientName || order.customerName} (
                    {order.delivery.recipientPhone || order.customerPhone})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Dirección de entrega</span>
                  <span className="font-medium text-slate-700 block mt-0.5">
                    {order.deliveryAddress.street} #{order.deliveryAddress.number},{' '}
                    {order.deliveryAddress.neighborhood}
                  </span>
                  {order.deliveryAddress.reference && (
                    <span className="text-xs text-slate-500 italic block mt-0.5">
                      Ref: {order.deliveryAddress.reference}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Conductor de entrega</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {order.delivery.driverName
                      ? `${order.delivery.driverName} (${order.delivery.vehiclePlate || 'Vehículo asignado'})`
                      : deliveryNote(order).text}
                  </span>
                </div>

                {showDeliveryNote && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    Instrucción especial: {order.delivery.notes}
                  </p>
                )}

                {/* La entrega se asigna solo en Entregas; aquí solo se navega hasta allí. */}
                {canAssignDelivery(order) && (
                  <Link
                    to={deliveriesHref(order.id)}
                    className="block w-full mt-2 py-2.5 text-center text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors"
                  >
                    Asignar en Entregas
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Interactive Map (7 cols) */}
        <div className="lg:col-span-7">
          <OrderRouteMap order={order} />
        </div>
      </div>
    </div>
  );
};
