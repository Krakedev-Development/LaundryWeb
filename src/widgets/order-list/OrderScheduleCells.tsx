import { Order } from '../../types';
export function OrderScheduleCells({ order }: { order: Order }) {
  return (
    <>
      <td className="py-4 px-5 whitespace-nowrap">
        <div className="font-medium text-slate-800">{order.pickup.date}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {order.pickup.driverName ? (
            <span className="text-emerald-700 font-medium">
              {order.pickup.driverName}
            </span>
          ) : (
            <span className="text-amber-600 font-medium">Sin chofer</span>
          )}
        </div>
      </td>
      <td className="py-4 px-5 whitespace-nowrap">
        <div className="font-medium text-slate-800">
          {order.delivery.targetDate}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {order.delivery.driverName ? (
            <span className="text-emerald-700 font-medium">
              {order.delivery.driverName}
            </span>
          ) : (
            <span className="text-slate-400">Por programar</span>
          )}
        </div>
      </td>
    </>
  );
}
