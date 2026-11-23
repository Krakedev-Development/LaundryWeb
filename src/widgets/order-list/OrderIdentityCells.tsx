import { Order } from '../../types';

/**
 * Solicitud y cliente en una sola columna, y el servicio en otra que solo aparece en pantallas
 * de 1280 px o más (en pantallas menores el dato sigue en el detalle). Así la tabla entra entera
 * en escritorio y tablet sin esconder columnas detrás de un scroll horizontal.
 */
export function OrderIdentityCells({ order }: { order: Order }) {
  const displayCode =
    order.trackingNumber || `ORD-${String(order.id).slice(0, 4).toUpperCase()}`;
  return (
    <>
      <td className="py-4 px-4">
        <span className="font-bold text-primary font-mono text-sm whitespace-nowrap">
          {displayCode}
        </span>
        <div className="mt-0.5 font-semibold text-slate-900 truncate max-w-[170px]">
          {order.customerName}
        </div>
        <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
          {order.customerEmail || order.customerAddress?.neighborhood || 'Guayaquil'}
        </div>
      </td>
      <td className="hidden xl:table-cell py-4 px-4 whitespace-nowrap">
        <div className="font-medium text-slate-800">{order.serviceType}</div>
        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
          {order.itemCount} prendas ·{' '}
          {order.pricing.amountKnown === false
            ? 'Importe pendiente de pesaje'
            : `$${order.pricing.total}`}
        </div>
      </td>
    </>
  );
}
