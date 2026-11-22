import React from 'react';
import { OrderStatus } from '../../types';
import { ORDER_STATUS_TONE, TONE_STYLE } from '../../shared/ui/statusTone';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

/** Nombre visible de cada etapa de la solicitud. */
const STATUS_LABEL: Record<OrderStatus, string> = {
  WEIGHING: 'Pesaje pendiente',
  INSPECTION: 'Inspección',
  PRICING_PENDING: 'Precio y pago',
  CUSTOMER_APPROVAL_PENDING: 'Aprobación pendiente',
  DRAFT: 'Borrador',
  PAYMENT_PENDING: 'Pago pendiente',
  CONFIRMED: 'Confirmado',
  AWAITING_INTAKE: 'Recogida pendiente',
  READY: 'Listo para retiro',
  COMPLETED: 'Completado',
  ARRIVED_AT_FACILITY: 'Esperando recepción',
  CREATED: 'Nueva',
  PICKUP_PENDING: 'Sin asignar',
  PICKUP_ASSIGNED: 'Asignada',
  HEADING_TO_PICKUP: 'Hacia recogida',
  ARRIVED_FOR_PICKUP: 'Llegó a recogida',
  HEADING_TO_FACILITY: 'Camino a planta',
  ARRIVED_FOR_DELIVERY: 'Llegó a entrega',
  PICKED_UP: 'Recogida',
  AT_FACILITY: 'Recibida en planta',
  IN_PROCESS: 'En procesamiento',
  QUALITY_CONTROL: 'Control de calidad',
  READY_FOR_DELIVERY: 'Lista para entrega',
  DELIVERY_SCHEDULED: 'Entrega programada',
  DELIVERY_ASSIGNED: 'Chofer asignado',
  OUT_FOR_DELIVERY: 'En entrega',
  DELIVERED: 'Entregada',
  CLOSED: 'Finalizada',
  INCIDENT: 'Incidencia',
  CANCELLED: 'Cancelada',
  QUARANTINE: 'Incidencia',
};

/**
 * Etapa de la solicitud con su color según la escala compartida (`shared/ui/statusTone`):
 * azul en curso, ámbar requiere acción de la sede, rojo bloqueada, verde entregada, gris cerrada.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const tone = TONE_STYLE[ORDER_STATUS_TONE[status] ?? 'closed'];
  const label = STATUS_LABEL[status] ?? status;
  const py = size === 'sm' ? 'py-0.5 px-2 text-[11px]' : 'py-1 px-2.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border shadow-2xs ${tone.badge} ${py} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} shrink-0`} aria-hidden />
      {label}
    </span>
  );
};
