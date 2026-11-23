import { AlertTriangle, ArrowRight } from 'lucide-react';
import { EXCEPTIONS_STATUS } from '../../entities/order/model/orderListFilters';
import { OrderListModel } from '../../features/orders/model/useOrderList';

export function OrderExceptionsNotice({
  problematicOrders,
  setQuickTab,
  setSelectedStatus,
  setShowAdvancedFilters,
}: Pick<
  OrderListModel,
  | 'problematicOrders'
  | 'setQuickTab'
  | 'setSelectedStatus'
  | 'setShowAdvancedFilters'
>) {
  if (problematicOrders.length === 0) return null;

  return (
    <div
      role="status"
      className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
          <AlertTriangle className="w-4 h-4" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900">
            Atención requerida: {problematicOrders.length} solicitud(es)
            presentan excepciones operacionales
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Casos con SLA vencido, retención por incidencia o incidencias
            activas en curso.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setQuickTab('ALL');
          setSelectedStatus(EXCEPTIONS_STATUS);
          setShowAdvancedFilters(true);
        }}
        className="text-xs font-bold text-primary hover:text-primary-hover hover:underline shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors duration-150"
      >
        <span>Filtrar excepciones</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}
