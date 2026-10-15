import { EmptyState } from '../../components/common/EmptyState';
import { OrderListModel } from '../../features/orders/model/useOrderList';
import { OrderTableRow } from './OrderTableRow';
import { OrderTableHeader } from './OrderTableHeader';
export function OrdersTable({
  orders,
  sortedOrders,
  resetFilters,
  setAssigningOrder,
}: Pick<
  OrderListModel,
  'orders' | 'sortedOrders' | 'resetFilters' | 'setAssigningOrder'
>) {
  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {sortedOrders.length === 0 ? (
          <EmptyState
            title="No se encontraron solicitudes"
            subtitle="Prueba modificando los filtros de búsqueda o restableciendo los criterios seleccionados."
            action={{
              label: 'Restablecer filtros',
              onClick: resetFilters,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <OrderTableHeader />
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.map((order) => (
                  <OrderTableRow
                    key={order.id}
                    order={order}
                    setAssigningOrder={setAssigningOrder}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {sortedOrders.length} de {orders.length} solicitudes
            registradas
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            LaundryWeb Clean Operations
          </span>
        </div>
      </div>
    </>
  );
}
