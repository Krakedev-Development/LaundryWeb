import { EmptyState } from '../../components/common/EmptyState';
import { OrderListModel } from '../../features/orders/model/useOrderList';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { OrderTableRow } from './OrderTableRow';
import { OrderTableHeader } from './OrderTableHeader';
export function OrdersTable({
  orders,
  sortedOrders,
  filterKey,
  resetFilters,
  setAssigningOrder,
}: Pick<
  OrderListModel,
  'orders' | 'sortedOrders' | 'resetFilters' | 'setAssigningOrder'
> & {
  // Cambia con los filtros: vuelve a la primera página sin reaccionar a cada actualización.
  filterKey: string;
}) {
  const pagination = usePagination(sortedOrders, filterKey);
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <OrderTableHeader />
                <tbody className="divide-y divide-slate-100">
                  {pagination.rows.map((order) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      setAssigningOrder={setAssigningOrder}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination pagination={pagination} label="solicitudes" />
          </>
        )}

        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            {sortedOrders.length} de {orders.length} solicitudes registradas coinciden con los filtros
          </span>
        </div>
      </div>
    </>
  );
}
