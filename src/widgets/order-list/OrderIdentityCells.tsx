import { Order } from '../../types';

export function OrderIdentityCells({ order }: { order: Order }) {
  const displayCode =
    order.trackingNumber || `ORD-${String(order.id).slice(0, 4).toUpperCase()}`;
  return (
    <>
      <td className="py-4 px-5 whitespace-nowrap">
        <span className="font-bold text-[#0F4C81] font-mono text-[14px]">
          {displayCode}
        </span>
        <span
          className="block text-[10px] text-slate-400 font-mono mt-0.5"
          title={order.id}
        >
          ID: {order.id.slice(0, 8)}...
        </span>
      </td>
      <td className="py-4 px-5">
        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
          {order.customerName}
        </div>
        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
          {order.customerEmail || order.customerAddress?.neighborhood || 'Guayaquil'}
        </div>
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
