import { useEffect, useState } from 'react';
import { AssignDriverModal } from '../../components/common/AssignDriverModal';
import { useOrderList } from '../../features/orders/model/useOrderList';
import { OrdersListHeader } from '../../widgets/order-list/OrdersListHeader';
import { OrderExceptionsNotice } from '../../widgets/order-list/OrderExceptionsNotice';
import { FulfillmentModeFilter } from '../../widgets/order-list/FulfillmentModeFilter';
import { OrderQuickTabs } from '../../widgets/order-list/OrderQuickTabs';
import { OrderSearchToolbar } from '../../widgets/order-list/OrderSearchToolbar';
import { OrderAdvancedFilters } from '../../widgets/order-list/OrderAdvancedFilters';
import { OrdersTable } from '../../widgets/order-list/OrdersTable';
import { useApp } from '../../context/AppContext';
import { fetchFullOrders } from '../../services/api/ordersApi';
import { storageService } from '../../services/storage';

export const OrdersListPage = () => {
  const model = useOrderList();
  const { customers, facilities, drivers, orders } = useApp();
  const [, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    setSyncing(true);
    void (async () => {
      try {
        const remoteOrders = await fetchFullOrders(
          { pageSize: 50 },
          orders,
          customers,
          facilities,
          drivers,
        );
        if (!active) return;
        if (remoteOrders.length > 0) {
          storageService.saveOrders(remoteOrders);
        }
      } catch {
        // Fallback to local persisted orders when offline
      } finally {
        if (active) setSyncing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <OrdersListHeader />
      <OrderExceptionsNotice
        problematicOrders={model.problematicOrders}
        setQuickTab={model.setQuickTab}
        setSelectedStatus={model.setSelectedStatus}
      />
      <FulfillmentModeFilter mode={model.mode} setMode={model.setMode} />
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        <OrderQuickTabs
          tabCounts={model.tabCounts}
          quickTab={model.quickTab}
          setQuickTab={model.setQuickTab}
        />
        <OrderSearchToolbar
          searchQuery={model.searchQuery}
          setSearchQuery={model.setSearchQuery}
          showAdvancedFilters={model.showAdvancedFilters}
          setShowAdvancedFilters={model.setShowAdvancedFilters}
          activeFiltersCount={model.activeFiltersCount}
          resetFilters={model.resetFilters}
          quickTab={model.quickTab}
        />
        <OrderAdvancedFilters
          showAdvancedFilters={model.showAdvancedFilters}
          selectedStatus={model.selectedStatus}
          setSelectedStatus={model.setSelectedStatus}
          selectedPriority={model.selectedPriority}
          setSelectedPriority={model.setSelectedPriority}
          selectedFacility={model.selectedFacility}
          setSelectedFacility={model.setSelectedFacility}
          selectedDriver={model.selectedDriver}
          setSelectedDriver={model.setSelectedDriver}
          facilities={model.facilities}
          drivers={model.drivers}
        />
      </div>
      <OrdersTable
        orders={model.orders}
        sortedOrders={model.sortedOrders}
        filterKey={[
          model.searchQuery.trim(),
          model.mode,
          model.selectedStatus,
          model.selectedPriority,
          model.selectedFacility,
          model.selectedDriver,
          model.quickTab,
        ].join('|')}
        resetFilters={model.resetFilters}
        setAssigningOrder={model.setAssigningOrder}
      />
      {model.assigningOrder && (
        <AssignDriverModal
          order={model.assigningOrder}
          type="pickup"
          isOpen={true}
          onClose={() => model.setAssigningOrder(null)}
        />
      )}
    </div>
  );
};
