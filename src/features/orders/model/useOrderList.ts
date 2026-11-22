import { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { countOrderTabs } from '../../../entities/order/model/orderListCounts';
import { getProblematicOrders } from '../../../entities/order/model/orderListCounts';
import { filterOrderList } from '../../../entities/order/model/orderListFilters';
import { sortOrderList } from '../../../entities/order/model/orderListSort';
import { useOrderListFilters } from './useOrderListFilters';
/**
 * @param serverIds Ids que devolvió el servidor. Con ellos solo se listan esas solicitudes: lo que
 *   quedó guardado en este equipo no se muestra como si viniera del servidor. `null`: aún sin datos.
 */
export function useOrderList(serverIds: ReadonlySet<string> | null = null) {
  const { orders: stored, facilities, drivers } = useApp();
  const orders = useMemo(
    () => (serverIds ? stored.filter((o) => serverIds.has(o.id)) : []),
    [stored, serverIds],
  );
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
