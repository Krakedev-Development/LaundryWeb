import { operationalStage } from '../../../services/fulfillment';
import { Order } from '../../../types';

export function countOrderTabs(orders: Order[]) {
  return {
    ALL: orders.length,
    UNASSIGNED: orders.filter(
      (o) => operationalStage(o) === 'PICKUP_PENDING' || o.status === 'CONFIRMED',
    ).length,
    PICKUP_TODAY: orders.filter((o) =>
      o.pickup.date.toLowerCase().includes('hoy'),
    ).length,
    IN_PLANT: orders.filter((o) =>
      [
        'AT_FACILITY',
        'IN_PROCESS',
        'QUALITY_CONTROL',
        'QUARANTINE',
        'WEIGHING',
        'INSPECTION',
        'PRICING_PENDING',
      ].includes(operationalStage(o)) ||
      [
        'AT_FACILITY',
        'IN_PROCESS',
        'QUALITY_CONTROL',
        'QUARANTINE',
        'WEIGHING',
        'INSPECTION',
        'PRICING_PENDING',
      ].includes(o.status),
    ).length,
    DELIVERY: orders.filter((o) =>
      [
        'READY_FOR_DELIVERY',
        'DELIVERY_SCHEDULED',
        'DELIVERY_ASSIGNED',
        'OUT_FOR_DELIVERY',
      ].includes(operationalStage(o)) ||
      [
        'READY_FOR_DELIVERY',
        'DELIVERY_SCHEDULED',
        'DELIVERY_ASSIGNED',
        'OUT_FOR_DELIVERY',
      ].includes(o.status),
    ).length,
    CLOSED: orders.filter(
      (o) =>
        operationalStage(o) === 'CLOSED' ||
        o.status === 'CLOSED' ||
        o.status === 'COMPLETED',
    ).length,
  };
}

export function getProblematicOrders(orders: Order[]) {
  return orders.filter(
    (o) =>
      operationalStage(o) === 'QUARANTINE' ||
      o.status === 'QUARANTINE' ||
      o.status === 'INCIDENT' ||
      o.slaStatus === 'OVERDUE' ||
      o.incidentsCount > 0,
  );
}
