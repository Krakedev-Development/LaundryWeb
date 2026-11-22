import { useEffect, useState } from 'react';
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
import { ApiError } from '../../services/api/apiConfig';

export const OrdersListPage = () => {
  const { customers, facilities, drivers, orders } = useApp();
  // Solo se listan las solicitudes que devolvió el servidor (contrato 4). Sin respuesta se muestra
  // el error con "Reintentar", no lo que quedó guardado en este equipo.
  const [serverIds, setServerIds] = useState<ReadonlySet<string> | null>(null);
  const [sync, setSync] = useState<
    { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const model = useOrderList(serverIds);

  useEffect(() => {
    let active = true;
    setSync({ status: 'loading' });
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
        setServerIds(new Set(remoteOrders.map((o) => o.id)));
        setSync({ status: 'ready' });
      } catch (e) {
        if (!active) return;
        setServerIds(null);
        setSync({
          status: 'error',
          message:
            e instanceof ApiError && e.status === 0
              ? 'No se pudo conectar con el servidor.'
              : e instanceof Error
                ? e.message
                : 'Error desconocido.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

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
      {sync.status === 'loading' && (
        <p role="status" className="py-6 text-center text-sm text-slate-500">
          Cargando solicitudes del servidor…
        </p>
      )}
      {sync.status === 'error' && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">No se pudieron cargar las solicitudes del servidor.</p>
          <p className="mt-1">
            {sync.message} No se muestran datos guardados en este equipo, para no actuar sobre
            información desactualizada.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
          >
            Reintentar
          </button>
        </div>
      )}
      {sync.status === 'ready' && (
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
      />
      )}
    </div>
  );
};
