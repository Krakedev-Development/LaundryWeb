import { QuickTab } from '../../entities/order/model/orderList.types';
import { OrderListModel } from '../../features/orders/model/useOrderList';
export function OrderQuickTabs({
  tabCounts,
  quickTab,
  setQuickTab,
}: Pick<OrderListModel, 'tabCounts' | 'quickTab' | 'setQuickTab'>) {
  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { key: 'ALL', label: 'Todas', count: tabCounts.ALL },
            {
              key: 'UNASSIGNED',
              label: 'Sin Asignar',
              count: tabCounts.UNASSIGNED,
              alert: tabCounts.UNASSIGNED > 0,
            },
            {
              key: 'PICKUP_TODAY',
              label: 'Recogida Hoy',
              count: tabCounts.PICKUP_TODAY,
            },
            { key: 'IN_PLANT', label: 'En Planta', count: tabCounts.IN_PLANT },
            { key: 'DELIVERY', label: 'En Entrega', count: tabCounts.DELIVERY },
            { key: 'CLOSED', label: 'Finalizadas', count: tabCounts.CLOSED },
          ] satisfies {
            key: QuickTab;
            label: string;
            count: number;
            alert?: boolean;
          }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setQuickTab(tab.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              quickTab === tab.key
                ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full tabular-nums ${
                quickTab === tab.key
                  ? 'bg-white text-sky-800 shadow-2xs font-bold'
                  : tab.alert
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
