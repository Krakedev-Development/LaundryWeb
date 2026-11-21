import { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { countOrderTabs } from '../../../entities/order/model/orderListCounts';
import { getProblematicOrders } from '../../../entities/order/model/orderListCounts';
import { filterOrderList } from '../../../entities/order/model/orderListFilters';
import { sortOrderList } from '../../../entities/order/model/orderListSort';
import { useOrderListFilters } from './useOrderListFilters';
export function useOrderList() {
  const { orders, facilities, drivers } = useApp();
  const filters = useOrderListFilters();
  const tabCounts = useMemo(() => countOrderTabs(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterOrderList(orders, filters),
    [
      orders,
      filters.quickTab,
      filters.searchQuery,
      filters.selectedStatus,
      filters.selectedPriority,
      filters.selectedFacility,
      filters.selectedDriver,
      filters.mode,
    ],
  );
  const sortedOrders = useMemo(
    () => sortOrderList(filteredOrders),
    [filteredOrders],
  );
  const problematicOrders = getProblematicOrders(orders);
  return {
    ...filters,
    orders,
    facilities,
    drivers,
    tabCounts,
    sortedOrders,
    problematicOrders,
  };
}
export type OrderListModel = ReturnType<typeof useOrderList>;
