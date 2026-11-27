import React from 'react';
import { OrderStatus } from '../../types';
import { ORDER_STATUS_TONE, TONE_STYLE } from '../../shared/ui/statusTone';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

/**
 * Nombre visible de cada etapa de la solicitud, para el personal. Se lee fuera de contexto (listas,
 * mapa, tablero), así que dice de qué tramo se trata: "Recogida asignada" y "Entrega asignada".
 * Femenino porque se refiere a la solicitud.
 */
const STATUS_LABEL: Record<OrderStatus, string> = {
  WEIGHING: 'En pesaje',
  INSPECTION: 'Inspección',
  PRICING_PENDING: 'Precio pendiente',
  CUSTOMER_APPROVAL_PENDING: 'Aprobación pendiente',
  DRAFT: 'Borrador',
  PAYMENT_PENDING: 'Pago pendiente',
  CONFIRMED: 'Confirmada',
  AWAITING_INTAKE: 'Recogida pendiente',
  READY: 'Lista para retiro',
  COMPLETED: 'Completada',
  ARRIVED_AT_FACILITY: 'Esperando recepción',
  CREATED: 'Nueva',
  PICKUP_PENDING: 'Recogida sin chofer',
  PICKUP_ASSIGNED: 'Recogida asignada',
  HEADING_TO_PICKUP: 'Chofer hacia recogida',
  ARRIVED_FOR_PICKUP: 'Chofer en domicilio',
  HEADING_TO_FACILITY: 'Camino a planta',
  ARRIVED_FOR_DELIVERY: 'Chofer en entrega',
  PICKED_UP: 'Prendas recogidas',
  AT_FACILITY: 'Recibida en planta',
  IN_PROCESS: 'En procesamiento',
  QUALITY_CONTROL: 'Control de calidad',
  READY_FOR_DELIVERY: 'Lista para entrega',
  DELIVERY_SCHEDULED: 'Entrega programada',
  DELIVERY_ASSIGNED: 'Entrega asignada',
  OUT_FOR_DELIVERY: 'En reparto',
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
  const py = size === 'sm' ? 'py-0.5 px-2.5 text-[11px]' : 'py-1 px-3 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-2xs ${tone.badge} ${py} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} shrink-0`} aria-hidden />
      {label}
    </span>
  );
};
