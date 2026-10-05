import React from 'react';
import { OrderStatus } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  // Config complying with #16 & #12 (Human-readable, clear semantic meaning)
  const configMap: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    DRAFT: {
      label: 'Borrador',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
    PAYMENT_PENDING: {
      label: 'Pago pendiente',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    CONFIRMED: {
      label: 'Confirmado',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    AWAITING_INTAKE: {
      label: 'Esperando ingreso',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    READY: {
      label: 'Listo para retiro',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    COMPLETED: {
      label: 'Completado',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    ARRIVED_AT_FACILITY: {
      label: 'Esperando recepción',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    CREATED: {
      label: 'Nueva',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    PICKUP_PENDING: {
      label: 'Sin asignar',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    PICKUP_ASSIGNED: {
      label: 'Asignada',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
    },
    HEADING_TO_PICKUP: {
      label: 'Hacia recogida',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
    },
    ARRIVED_FOR_PICKUP: {
      label: 'Llegó a recogida',
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      dot: 'bg-teal-600',
    },
    HEADING_TO_FACILITY: {
      label: 'Camino a planta',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      dot: 'bg-sky-600',
    },
    ARRIVED_FOR_DELIVERY: {
      label: 'Llegó a entrega',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-600',
    },
    PICKED_UP: {
      label: 'Recogida',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      dot: 'bg-teal-500',
    },
    AT_FACILITY: {
      label: 'Recibida en planta',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      dot: 'bg-sky-500',
    },
    IN_PROCESS: {
      label: 'En procesamiento',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-600',
    },
    QUALITY_CONTROL: {
      label: 'Control de calidad',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    READY_FOR_DELIVERY: {
      label: 'Lista para entrega',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    DELIVERY_SCHEDULED: {
      label: 'Entrega programada',
      bg: 'bg-lime-50',
      text: 'text-lime-800',
      border: 'border-lime-300',
      dot: 'bg-lime-600',
    },
    DELIVERY_ASSIGNED: {
      label: 'Chofer asignado',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-600',
    },
    OUT_FOR_DELIVERY: {
      label: 'En entrega',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
    },
    DELIVERED: {
      label: 'Entregada',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-600',
    },
    CLOSED: {
      label: 'Finalizada',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
    INCIDENT: {
      label: 'Incidencia',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    CANCELLED: {
      label: 'Cancelada',
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
    QUARANTINE: {
      label: 'Inscidencia',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
  };

  const conf = configMap[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const py = size === 'sm' ? 'py-0.5 px-2 text-[11px]' : 'py-1 px-2.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${conf.bg} ${conf.text} ${conf.border} ${py} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} shrink-0`} />
      {conf.label}
    </span>
  );
};
