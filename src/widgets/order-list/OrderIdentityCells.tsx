import { Link } from 'react-router-dom';
import { Order } from '../../types';

export function OrderIdentityCells({ order }: { order: Order }) {
  const displayCode =
    order.trackingNumber || `ORD-${String(order.id).slice(0, 4).toUpperCase()}`;
  const secondary =
    order.customerAddress?.neighborhood ||
    order.customerEmail ||
    null;

  return (
    <>
      <td className="py-4 px-5 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-slate-50/70">
        <Link
          to={`/operations/orders/${order.id}`}
          className="font-bold text-primary font-mono text-[14px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm"
        >
          {displayCode}
        </Link>
      </td>
      <td className="py-4 px-5">
        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
          {order.customerName}
        </div>
        {secondary && (
          <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
            {secondary}
          </div>
        )}
      </td>
      <td className="py-4 px-5 whitespace-nowrap">
        <div className="font-medium text-slate-800">{order.serviceType}</div>
        <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
          {order.itemCount} prendas ·{' '}
          {order.pricing.amountKnown === false
            ? 'Importe pendiente de pesaje'
            : `$${order.pricing.total}`}
        </div>
      </td>
    </>
  );
}
