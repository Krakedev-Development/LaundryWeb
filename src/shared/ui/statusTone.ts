// Escala de colores de estado: un color por significado, igual en todas las pantallas.
// Un mismo color nunca significa dos cosas: el ámbar avisa que alguien de la sede debe actuar,
// el verde dice que la ropa ya llegó al cliente.
import type { OrderStatus } from '../../types';

export type StatusTone = 'progress' | 'action' | 'blocked' | 'done' | 'closed';

/** Clases del badge (fondo, texto, borde) y del punto indicador para cada tono. */
export const TONE_STYLE: Record<StatusTone, { badge: string; dot: string }> = {
  /** Avanza con normalidad; nadie de la sede necesita intervenir ahora. */
  progress: { badge: 'bg-primary-soft text-primary border-primary/20', dot: 'bg-primary' },
  /** Se detiene hasta que alguien de la sede actúe (asignar, recibir, cobrar). */
  action: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  /** Bloqueada: retenida por una incidencia. */
  blocked: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  /** Terminada: la ropa ya llegó al cliente. */
  done: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' },
  /** Cerrada o cancelada: ya no requiere atención. */
  closed: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

/** Tono de cada etapa de la solicitud. */
export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  DRAFT: 'closed',
  CREATED: 'progress',
  CONFIRMED: 'progress',
  PAYMENT_PENDING: 'action',
  AWAITING_INTAKE: 'action',
  PICKUP_PENDING: 'action',
  PICKUP_ASSIGNED: 'progress',
  HEADING_TO_PICKUP: 'progress',
  ARRIVED_FOR_PICKUP: 'progress',
  PICKED_UP: 'progress',
  HEADING_TO_FACILITY: 'progress',
  ARRIVED_AT_FACILITY: 'action',
  AT_FACILITY: 'progress',
  WEIGHING: 'progress',
  INSPECTION: 'progress',
  PRICING_PENDING: 'progress',
  CUSTOMER_APPROVAL_PENDING: 'progress',
  IN_PROCESS: 'progress',
  QUALITY_CONTROL: 'progress',
  READY: 'progress',
  READY_FOR_DELIVERY: 'action',
  DELIVERY_SCHEDULED: 'action',
  DELIVERY_ASSIGNED: 'progress',
  OUT_FOR_DELIVERY: 'progress',
  ARRIVED_FOR_DELIVERY: 'progress',
  DELIVERED: 'done',
  COMPLETED: 'done',
  CLOSED: 'closed',
  CANCELLED: 'closed',
  INCIDENT: 'blocked',
  QUARANTINE: 'blocked',
};
