import { AlertTriangle } from 'lucide-react';
import { OrderListModel } from '../../features/orders/model/useOrderList';
export function OrderExceptionsNotice({
  problematicOrders,
  setQuickTab,
  setSelectedStatus,
}: Pick<
  OrderListModel,
  'problematicOrders' | 'setQuickTab' | 'setSelectedStatus'
>) {
  return (
    <>
      {problematicOrders.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Atención Requerida: {problematicOrders.length} solicitud(es)
                presentan excepciones operacionales
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Casos con SLA vencido, retención en inscidencia o incidencias
                activas en curso.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setQuickTab('ALL');
              setSelectedStatus('QUARANTINE');
            }}
            className="text-xs font-bold text-sky-800 hover:text-sky-900 hover:underline shrink-0"
          >
            Filtrar excepciones →
          </button>
        </div>
      )}
    </>
  );
}
