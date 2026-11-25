import { useEffect, useRef, useState } from 'react';
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
import { useOrderStatusRealtime } from '../../hooks/useOrderStatusRealtime';

export const OrdersListPage = () => {
  const { customers, facilities, drivers, orders } = useApp();
  // Solo se listan las solicitudes que devolvió el servidor (contrato 4). Sin respuesta se muestra
  // el error con "Reintentar", no lo que quedó guardado en este equipo.
  const [serverIds, setServerIds] = useState<ReadonlySet<string> | null>(null);
  const [sync, setSync] = useState<
    { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Aviso del servidor (cancelación, reprogramación, avance): recarga sin vaciar la tabla.
  const [liveTick, setLiveTick] = useState(0);
  const quietReload = useRef(false);
  useOrderStatusRealtime(() => {
    quietReload.current = true;
    setLiveTick((n) => n + 1);
  });
  const model = useOrderList(serverIds);

  useEffect(() => {
    let active = true;
    const quiet = quietReload.current;
    quietReload.current = false;
    if (!quiet) setSync({ status: 'loading' });
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
        // Si falla una recarga por aviso se conserva la lista que ya se veía.
        if (!active || quiet) return;
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
  }, [attempt, liveTick]);

  return (
    <div className="space-y-8">
      <OrdersListHeader />
      <OrderExceptionsNotice
        problematicOrders={model.problematicOrders}
        setQuickTab={model.setQuickTab}
        setSelectedStatus={model.setSelectedStatus}
      />
      <FulfillmentModeFilter mode={model.mode} setMode={model.setMode} />
      <div className="fintech-card p-5 sm:p-6 space-y-5">
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
        <div role="status" className="fintech-card overflow-hidden p-5 space-y-3">
          <p className="text-xs font-semibold text-subtle">
            Cargando solicitudes del servidor…
          </p>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-12 rounded-xl skeleton-shimmer" />
          ))}
        </div>
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
