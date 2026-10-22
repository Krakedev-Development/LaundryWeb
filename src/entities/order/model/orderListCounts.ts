import { operationalStage } from '../../../services/fulfillment';
import { Order } from '../../../types';
export function countOrderTabs(orders: Order[]) {
  return {
    ALL: orders.length,
    UNASSIGNED: orders.filter((o) => operationalStage(o) === 'PICKUP_PENDING')
      .length,
    PICKUP_TODAY: orders.filter((o) =>
      o.pickup.date.toLowerCase().includes('hoy'),
    ).length,
    IN_PLANT: orders.filter((o) =>
      ['AT_FACILITY', 'IN_PROCESS', 'QUALITY_CONTROL', 'QUARANTINE'].includes(
        operationalStage(o),
      ),
    ).length,
    DELIVERY: orders.filter((o) =>
      [
        'READY_FOR_DELIVERY',
        'DELIVERY_SCHEDULED',
        'DELIVERY_ASSIGNED',
        'OUT_FOR_DELIVERY',
      ].includes(operationalStage(o)),
    ).length,
    CLOSED: orders.filter((o) => operationalStage(o) === 'CLOSED').length,
  };
}
export function getProblematicOrders(orders: Order[]) {
  return orders.filter(
    (o) =>
      operationalStage(o) === 'QUARANTINE' ||
      o.slaStatus === 'OVERDUE' ||
      o.incidentsCount > 0,
  );
}
