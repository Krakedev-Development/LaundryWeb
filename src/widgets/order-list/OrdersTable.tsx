import { Inbox } from 'lucide-react';
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
}: Pick<OrderListModel, 'orders' | 'sortedOrders' | 'resetFilters'> & {
  filterKey: string;
}) {
  const pagination = usePagination(sortedOrders, filterKey);
  const end = Math.min(pagination.start + pagination.pageSize, sortedOrders.length);
  const statusText =
    sortedOrders.length === orders.length
      ? `Mostrando ${pagination.start + 1}–${end} de ${orders.length} solicitudes`
      : `${sortedOrders.length} de ${orders.length} coinciden con los filtros · ${pagination.start + 1}–${end}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      {sortedOrders.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6 text-primary" aria-hidden />}
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
                  <OrderTableRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            pagination={pagination}
            label="solicitudes"
            statusText={statusText}
            className="border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 text-slate-500"
          />
        </>
      )}
    </div>
  );
}
