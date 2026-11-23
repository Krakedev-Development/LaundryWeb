import { QuickTab } from '../../entities/order/model/orderList.types';
import { OrderListModel } from '../../features/orders/model/useOrderList';

export function OrderQuickTabs({
  tabCounts,
  quickTab,
  setQuickTab,
}: Pick<OrderListModel, 'tabCounts' | 'quickTab' | 'setQuickTab'>) {
  const tabs = [
    { key: 'ALL', label: 'Todas', count: tabCounts.ALL },
    {
      key: 'UNASSIGNED',
      label: 'Sin asignar',
      count: tabCounts.UNASSIGNED,
      alert: tabCounts.UNASSIGNED > 0,
    },
    {
      key: 'PICKUP_TODAY',
      label: 'Recogida hoy',
      count: tabCounts.PICKUP_TODAY,
    },
    { key: 'IN_PLANT', label: 'En planta', count: tabCounts.IN_PLANT },
    { key: 'DELIVERY', label: 'En entrega', count: tabCounts.DELIVERY },
    { key: 'CLOSED', label: 'Finalizadas', count: tabCounts.CLOSED },
  ] satisfies {
    key: QuickTab;
    label: string;
    count: number;
    alert?: boolean;
  }[];

  return (
    <div
      role="group"
      aria-label="Filtros rápidos de solicitudes"
      className="flex items-center gap-2 overflow-x-auto pb-1"
    >
      {tabs.map((tab) => {
        const active = quickTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active}
            onClick={() => setQuickTab(tab.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors duration-150 shrink-0 flex items-center gap-2 cursor-pointer ${
              active
                ? 'bg-primary-soft text-primary font-bold border border-primary/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full tabular-nums ${
                active
                  ? 'bg-white text-primary shadow-2xs font-bold'
                  : tab.alert
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
