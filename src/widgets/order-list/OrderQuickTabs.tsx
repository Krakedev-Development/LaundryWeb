import { LayoutGroup, motion } from 'framer-motion';
import { selectionTransition } from '../../shared/motion/tokens';
import { QuickTab } from '../../entities/order/model/orderList.types';
import { OrderListModel } from '../../features/orders/model/useOrderList';
export function OrderQuickTabs({
  tabCounts,
  quickTab,
  setQuickTab,
}: Pick<OrderListModel, 'tabCounts' | 'quickTab' | 'setQuickTab'>) {
  return (
    <LayoutGroup id="order-filters">
      <div className="lw-quick-tabs flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
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
          }[]
        ).map((tab) => (
          <button
            key={tab.key}
            aria-pressed={quickTab === tab.key}
            onClick={() => setQuickTab(tab.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              quickTab === tab.key
                ? 'text-primary font-bold border border-transparent'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            {quickTab === tab.key && (
              <motion.span
                aria-hidden="true"
                layoutId="selection"
                className="lw-tab-indicator lw-filter-indicator"
                transition={selectionTransition}
              />
            )}
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
    </LayoutGroup>
  );
}
