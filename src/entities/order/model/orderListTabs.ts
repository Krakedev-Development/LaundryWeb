import { operationalStage } from '../../../services/fulfillment';
import { Order } from '../../../types';
import { QuickTab } from './orderList.types';

export function matchesQuickTab(order: Order, quickTab: QuickTab) {
  if (
    quickTab === 'UNASSIGNED' &&
    operationalStage(order) !== 'PICKUP_PENDING' &&
    order.status !== 'CONFIRMED'
  )
    return false;
  if (
    quickTab === 'PICKUP_TODAY' &&
    !order.pickup.date.toLowerCase().includes('hoy')
  )
    return false;
  if (
    quickTab === 'IN_PLANT' &&
    ![
      'AT_FACILITY',
      'IN_PROCESS',
      'QUALITY_CONTROL',
      'QUARANTINE',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
    ].includes(operationalStage(order)) &&
    ![
      'AT_FACILITY',
      'IN_PROCESS',
      'QUALITY_CONTROL',
      'QUARANTINE',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
    ].includes(order.status)
  )
    return false;
  if (
    quickTab === 'DELIVERY' &&
    ![
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
    ].includes(operationalStage(order)) &&
    ![
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
    ].includes(order.status)
  )
    return false;
  if (
    quickTab === 'CLOSED' &&
    operationalStage(order) !== 'CLOSED' &&
    order.status !== 'CLOSED' &&
    order.status !== 'COMPLETED'
  )
    return false;
  return true;
}
