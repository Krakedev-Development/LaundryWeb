import React from 'react';
import { Link } from 'react-router-dom';
import { deliveriesHref, dispatchHref } from '../../../services/operationsLinks';
import {
  MapPin,
  Truck,
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { Order } from '../../../types';
import { operationalStage } from '../../../services/fulfillment';
import { OrderRouteMap } from '../../../components/maps/OrderRouteMap';

interface LogisticsTabProps {
  order: Order;
}

export const LogisticsTab: React.FC<LogisticsTabProps> = ({ order }) => {
  const stage = operationalStage(order);

  // Determine actual pickup status (Solving Finding H-03)
  const isPickupCompleted =
    Boolean(order.pickup.completedAt) ||
    [
      'PICKED_UP',
      'HEADING_TO_FACILITY',
      'ARRIVED_AT_FACILITY',
      'AT_FACILITY',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
      'CUSTOMER_APPROVAL_PENDING',
      'IN_PROCESS',
      'QUALITY_CONTROL',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
      'ARRIVED_FOR_DELIVERY',
      'DELIVERED',
      'CLOSED',
    ].includes(stage);

  const isPickupInRoute = stage === 'HEADING_TO_PICKUP' || stage === 'ARRIVED_FOR_PICKUP';
  const isPickupAssigned = Boolean(order.pickup.driverId) || stage === 'PICKUP_ASSIGNED';

  const pickupStatusLabel = isPickupCompleted
    ? 'Completada'
    : isPickupInRoute
      ? 'En camino'
      : isPickupAssigned
        ? 'Asignada'
        : 'Pendiente de asignación';

  // Determine actual delivery status (Solving Finding H-03)
  const isDeliveryDelivered =
    Boolean(order.delivery.completedAt) || stage === 'DELIVERED' || stage === 'CLOSED';
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
          ? 'Lista para entrega'
          : 'Programada (en proceso de planta)';

  return (
    <div className="space-y-6">
      {/* Side-by-side Recogida & Entrega Logistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recogida Card */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-xs text-navy uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span>Logística de Recogida</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
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

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Fecha y franja horaria</span>
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {order.pickup.date} · {order.pickup.timeSlot}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Dirección de recogida</span>
              <span className="font-medium text-slate-700 block mt-0.5">
                {order.customerAddress.street} #{order.customerAddress.number},{' '}
                {order.customerAddress.neighborhood}
              </span>
              {order.customerAddress.reference && (
                <span className="text-[11px] text-slate-400 italic block">
                  Ref: {order.customerAddress.reference}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Conductor asignado</span>
              <span className="font-semibold text-slate-900 block mt-0.5">
                {order.pickup.driverName
                  ? `${order.pickup.driverName} (${order.pickup.vehiclePlate || 'Vehículo asignado'})`
                  : 'Sin asignar aún'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                {isPickupCompleted
                  ? 'Custodia verificada y registrada en planta.'
                  : 'Custodia pendiente de retiro en el domicilio.'}
              </span>
            </div>

            {order.pickup.notes && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                Nota: {order.pickup.notes}
              </p>
            )}

            {/* La recogida se asigna solo en Despacho; aquí solo se navega hasta allí. */}
            {!isPickupCompleted && !order.pickup.driverName && (
              <Link
                to={dispatchHref(order.id)}
                className="block w-full mt-2 py-2 text-center text-xs font-semibold text-primary bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
              >
                Asignar en Despacho
              </Link>
            )}
          </div>
        </section>

        {/* Entrega Card */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-xs text-navy uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <span>Logística de Entrega</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
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

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Fecha objetivo y franja horaria</span>
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {order.delivery.targetDate} · {order.delivery.timeSlot}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Destinatario de entrega</span>
              <span className="font-medium text-slate-700 block mt-0.5">
                {order.delivery.recipientName || order.customerName} (
                {order.delivery.recipientPhone || order.customerPhone})
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Dirección de entrega</span>
              <span className="font-medium text-slate-700 block mt-0.5">
                {order.deliveryAddress.street} #{order.deliveryAddress.number},{' '}
                {order.deliveryAddress.neighborhood}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Conductor de entrega</span>
              <span className="font-semibold text-slate-900 block mt-0.5">
                {order.delivery.driverName
                  ? `${order.delivery.driverName} (${order.delivery.vehiclePlate || 'Vehículo asignado'})`
                  : 'Pendiente de asignación de entrega'}
              </span>
            </div>

            {order.delivery.notes && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                Nota: {order.delivery.notes}
              </p>
            )}

            {/* La entrega se asigna solo en Entregas; aquí solo se navega hasta allí. */}
            {!isDeliveryDelivered &&
              !order.delivery.driverName &&
              isDeliveryReady &&
              order.fulfillment?.outbound.method === 'DRIVER' && (
              <Link
                to={deliveriesHref(order.id)}
                className="block w-full mt-2 py-2 text-center text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
              >
                Asignar en Entregas
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Agenda en solo lectura: la reprogramación por el personal (B3) aún no existe en el servidor. */}
      <section
        aria-label="Agenda y horarios"
        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-center gap-3"
      >
        <div className="p-2.5 rounded-xl bg-sky-100 text-primary">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Agenda y horarios
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Recogida: {order.pickup.date} ({order.pickup.timeSlot}) · Entrega:{' '}
            {order.delivery.targetDate} ({order.delivery.timeSlot})
          </p>
          <p className="text-xs text-slate-600 mt-1">
            La reprogramación por el personal aún no está disponible.
          </p>
        </div>
      </section>

      {/* Interactive Route Map */}
      <OrderRouteMap order={order} />
    </div>
  );
};
