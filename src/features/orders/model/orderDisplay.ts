// Cómo se MUESTRA la etapa de una solicitud. Solo presentación: no cambia su estado real ni el
// flujo. Centraliza estas reglas para que la lista, el detalle y Logística digan lo mismo.
import { operationalStage } from '../../../services/fulfillment';
import type { Order, OrderStatus } from '../../../types';

/** Etapas en las que el chofer ya retiró la ropa del domicilio. */
const PICKUP_DONE: string[] = [
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
  'READY',
  'READY_FOR_DELIVERY',
  'DELIVERY_SCHEDULED',
  'DELIVERY_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'ARRIVED_FOR_DELIVERY',
  'DELIVERED',
  'CLOSED',
  'QUARANTINE',
];

/** Etapas en las que la ropa está en proceso en planta. */
export const IN_PLANT_STAGES: string[] = [
  'AT_FACILITY',
  'WEIGHING',
  'INSPECTION',
  'PRICING_PENDING',
  'CUSTOMER_APPROVAL_PENDING',
  'IN_PROCESS',
  'QUALITY_CONTROL',
];

export const isInPlant = (order: Order): boolean =>
  IN_PLANT_STAGES.includes(operationalStage(order));

export function isPendingPaymentOrConfirmation(order: Order): boolean {
  const stage = operationalStage(order);
  return (
    stage === 'PAYMENT_PENDING' ||
    stage === 'CREATED' ||
    order.status === 'PAYMENT_PENDING' ||
    order.status === 'CREATED' ||
    order.pricing?.paymentStatus === 'PENDING'
  );
}

export function getMilestoneIndex(stage: string): number {
  if (['DELIVERED', 'CLOSED', 'COMPLETED'].includes(stage)) return 4;
  if (
    [
      'READY',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
      'ARRIVED_FOR_DELIVERY',
    ].includes(stage)
  )
    return 3;
  if (
    [
      'AT_FACILITY',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
      'CUSTOMER_APPROVAL_PENDING',
      'IN_PROCESS',
      'QUALITY_CONTROL',
    ].includes(stage)
  )
    return 2;
  if (['PICKED_UP', 'HEADING_TO_FACILITY', 'ARRIVED_AT_FACILITY'].includes(stage))
    return 1;
  return 0; // CONFIRMED, CREATED, PAYMENT_PENDING, PICKUP_PENDING, PICKUP_ASSIGNED, etc.
}

const ROLE_TRANSLATIONS: Record<string, string> = {
  CLIENT: 'Cliente',
  CUSTOMER: 'Cliente',
  DRIVER: 'Chofer',
  OPERATOR: 'Operador de planta',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
  SYSTEM: 'Sistema',
};

export function formatActor(
  userName?: string,
  userRole?: string
): { name: string; roleLabel?: string } {
  const roleUpper = (userRole || '').toUpperCase();
  const roleTranslated = ROLE_TRANSLATIONS[roleUpper] || userRole || '';
  const rawName = (userName || '').trim();

  if (!rawName || rawName.toUpperCase() === roleUpper) {
    return { name: roleTranslated || 'Sistema' };
  }

  if (ROLE_TRANSLATIONS[rawName.toUpperCase()]) {
    return { name: ROLE_TRANSLATIONS[rawName.toUpperCase()] };
  }

  return {
    name: rawName,
    roleLabel:
      roleTranslated && roleTranslated.toLowerCase() !== rawName.toLowerCase()
        ? roleTranslated
        : undefined,
  };
}

/** Etapas en las que la recogida todavía espera que la sede asigne chofer. */
const PICKUP_NEEDS_DRIVER: string[] = ['CREATED', 'CONFIRMED', 'PICKUP_PENDING', 'PAYMENT_PENDING'];

/** Etapas listas para salir de la planta: la entrega a domicilio espera chofer. */
const DELIVERY_NEEDS_DRIVER: string[] = ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'];

export const isPickupCompleted = (order: Order) =>
  Boolean(order.pickup.completedAt) || PICKUP_DONE.includes(operationalStage(order));

export const isDeliveryCompleted = (order: Order) =>
  Boolean(order.delivery.completedAt) ||
  ['DELIVERED', 'CLOSED'].includes(operationalStage(order));

/** La ropa vuelve al cliente en la sede (retiro), no por chofer. */
export const isStorePickup = (order: Order) => order.fulfillment?.outbound.method === 'CUSTOMER';

/**
 * Condición canónica para asignar chofer de recogida en Despacho.
 * Requiere: etapa de recogida, método chofer, sin reprogramación pendiente, pago validado y sin chofer asignado aún.
 */
export function canAssignPickup(order: Order): boolean {
  const stage = operationalStage(order);
  const isPickupStage = stage === 'CONFIRMED' || stage === 'PICKUP_PENDING';
  const isDriverMethod = order.fulfillment?.inbound.method === 'DRIVER';
  const notRescheduling = !order.pickupNeedsScheduling;
  const isPaid =
    order.pricing?.paymentStatus !== 'PENDING' &&
    order.status !== 'PAYMENT_PENDING' &&
    stage !== 'PAYMENT_PENDING';
  const notAssigned = !order.pickup.driverId && !order.pickup.driverName;
  const notCompleted = !order.pickup.completedAt && !isPickupCompleted(order);

  return isPickupStage && isDriverMethod && notRescheduling && isPaid && notAssigned && notCompleted;
}

/**
 * Condición canónica para asignar chofer de entrega en Entregas.
 * Requiere: prendas listas para entrega a domicilio, sin chofer asignado aún y no completada.
 */
export function canAssignDelivery(order: Order): boolean {
  const stage = operationalStage(order);
  const isDeliveryStage = stage === 'READY_FOR_DELIVERY' || stage === 'DELIVERY_SCHEDULED';
  const isDriverMethod = order.fulfillment?.outbound.method === 'DRIVER';
  const notAssigned = !order.delivery.driverId && !order.delivery.driverName;
  const notCompleted = !order.delivery.completedAt && !isDeliveryCompleted(order);

  return isDeliveryStage && isDriverMethod && notAssigned && notCompleted;
}

/**
 * Etapa para mostrar en el badge. Una solicitud lista para retiro en sede se muestra como
 * "Listo para retiro" (solo espera al cliente) y no como "Lista para entrega", que avisa que
 * la sede debe asignar un chofer.
 */
export function orderDisplayStage(order: Order): OrderStatus {
  const stage = operationalStage(order);
  if (DELIVERY_NEEDS_DRIVER.includes(stage) && isStorePickup(order)) return 'READY';
  return stage;
}

export type LegNote = { text: string; tone: 'driver' | 'action' | 'muted' };

/** Segunda línea de la columna Recogida: el chofer, o qué pasa con la recogida. */
export function pickupNote(order: Order): LegNote {
  if (order.pickup.driverName) return { text: order.pickup.driverName, tone: 'driver' };
  if (isPickupCompleted(order)) return { text: 'Recogida completada', tone: 'muted' };
  if (PICKUP_NEEDS_DRIVER.includes(operationalStage(order)))
    return { text: 'Sin chofer', tone: 'action' };
  return { text: 'Chofer por confirmar', tone: 'muted' };
}

/** Segunda línea de la columna Entrega: el chofer, o qué pasa con la entrega. */
export function deliveryNote(order: Order): LegNote {
  if (order.delivery.driverName) return { text: order.delivery.driverName, tone: 'driver' };
  if (isDeliveryCompleted(order)) return { text: 'Entregada', tone: 'muted' };
  if (isStorePickup(order)) return { text: 'Retiro en sede', tone: 'muted' };
  if (DELIVERY_NEEDS_DRIVER.includes(operationalStage(order)))
    return { text: 'Sin chofer', tone: 'action' };
  if (isInPlant(order)) return { text: 'En planta', tone: 'muted' };
  return { text: 'Por programar', tone: 'muted' };
}

/** Clases de texto para cada tono de nota. */
export const LEG_NOTE_CLASS: Record<LegNote['tone'], string> = {
  driver: 'text-emerald-700 font-medium',
  action: 'text-amber-700 font-medium',
  muted: 'text-slate-500',
};
