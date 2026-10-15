import { operationalStage } from '../../../services/fulfillment';
import { Order } from '../../../types';
import { QuickTab } from './orderList.types';
export function matchesQuickTab(order: Order, quickTab: QuickTab) {
  if (quickTab === 'UNASSIGNED' && operationalStage(order) !== 'PICKUP_PENDING')
    return false;
  if (
    quickTab === 'PICKUP_TODAY' &&
    !order.pickup.date.toLowerCase().includes('hoy')
  )
    return false;
  if (
    quickTab === 'IN_PLANT' &&
    !['AT_FACILITY', 'IN_PROCESS', 'QUALITY_CONTROL', 'QUARANTINE'].includes(
      operationalStage(order),
    )
  )
    return false;
  if (
    quickTab === 'DELIVERY' &&
    ![
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
    ].includes(operationalStage(order))
  )
    return false;
  if (quickTab === 'CLOSED' && operationalStage(order) !== 'CLOSED')
    return false;
  return true;
}
