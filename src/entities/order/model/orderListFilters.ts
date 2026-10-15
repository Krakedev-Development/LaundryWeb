import { operationalStage } from '../../../services/fulfillment';
import { Order } from '../../../types';
import { OrderListFilters } from './orderList.types';
import { matchesOrderSearch } from './orderListSearch';
import { matchesQuickTab } from './orderListTabs';
export function filterOrderList(orders: Order[], filters: OrderListFilters) {
  const {
    mode,
    searchQuery,
    quickTab,
    selectedStatus,
    selectedPriority,
    selectedFacility,
    selectedDriver,
  } = filters;
  return orders.filter((order) => {
    if (mode !== 'ALL' && order.fulfillment?.mode !== mode) return false;
    if (!matchesOrderSearch(order, searchQuery)) return false;
    if (!matchesQuickTab(order, quickTab)) return false;
    if (selectedStatus !== 'ALL' && operationalStage(order) !== selectedStatus)
      return false;
    if (selectedPriority !== 'ALL' && order.priority !== selectedPriority)
      return false;
    if (selectedFacility !== 'ALL' && order.facilityId !== selectedFacility)
      return false;
    if (selectedDriver !== 'ALL') {
      const isAssigned =
        order.pickup.driverId === selectedDriver ||
        order.delivery.driverId === selectedDriver;
      if (!isAssigned) return false;
    }
    return true;
  });
}
