import { EmptyState } from '../../components/common/EmptyState';
import { OrderListModel } from '../../features/orders/model/useOrderList';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { StaggerTableBody } from '../../components/ui/StaggerList';
import { OrderTableRow } from './OrderTableRow';
import { OrderTableHeader } from './OrderTableHeader';

export function OrdersTable({
  orders,
  sortedOrders,
  filterKey,
  resetFilters,
}: Pick<OrderListModel, 'orders' | 'sortedOrders' | 'resetFilters'> & {
  // Cambia con los filtros: vuelve a la primera página sin reaccionar a cada actualización.
  filterKey: string;
}) {
  const pagination = usePagination(sortedOrders, filterKey);
  return (
    <div
      style={{ boxShadow: 'var(--shadow-card)' }}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
    >
      {sortedOrders.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No se encontraron solicitudes"
            subtitle="Prueba modificando los filtros de búsqueda o restableciendo los criterios seleccionados."
            action={{
              label: 'Restablecer filtros',
              onClick: resetFilters,
            }}
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <OrderTableHeader />
              <StaggerTableBody className="divide-y divide-slate-100/90">
                {pagination.rows.map((order) => (
                  <OrderTableRow key={order.id} order={order} />
                ))}
              </StaggerTableBody>
            </table>
          </div>
          <TablePagination pagination={pagination} label="solicitudes" />
        </>
      )}

      <div className="flex items-center justify-between border-t border-slate-200/75 bg-slate-50/70 px-6 py-3.5 text-xs text-slate-500">
        <span className="tabular-nums">
          {sortedOrders.length} de {orders.length} solicitudes registradas coinciden con los filtros
        </span>
      </div>
    </div>
  );
}
