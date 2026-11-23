import { QuickTab } from '../../entities/order/model/orderList.types';
import { OrderListModel } from '../../features/orders/model/useOrderList';
import { AnimatedPillTabs } from '../../components/ui/AnimatedPillTabs';

export function OrderQuickTabs({
  tabCounts,
  quickTab,
  setQuickTab,
}: Pick<OrderListModel, 'tabCounts' | 'quickTab' | 'setQuickTab'>) {
  return (
    <div className="overflow-x-auto pb-1">
      <AnimatedPillTabs<QuickTab>
        layoutId="order-quick-tabs"
        ariaLabel="Vistas rápidas de solicitudes"
        // En tablet las vistas pasan a una segunda línea en lugar de esconderse tras un scroll.
        className="flex-wrap"
        value={quickTab}
        onChange={setQuickTab}
        items={[
          { id: 'ALL', label: 'Todas', count: tabCounts.ALL },
          {
            id: 'UNASSIGNED',
            label: 'Sin asignar',
            count: tabCounts.UNASSIGNED,
            alert: tabCounts.UNASSIGNED > 0,
          },
          {
            id: 'PICKUP_TODAY',
            label: 'Recogida hoy',
            count: tabCounts.PICKUP_TODAY,
          },
          { id: 'IN_PLANT', label: 'En planta', count: tabCounts.IN_PLANT },
          { id: 'DELIVERY', label: 'En entrega', count: tabCounts.DELIVERY },
          { id: 'CLOSED', label: 'Finalizadas', count: tabCounts.CLOSED },
        ]}
      />
    </div>
  );
}
