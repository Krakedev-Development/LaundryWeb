import { operationalStage } from '../../services/fulfillment';
import { MODE_LABELS } from '../../services/BusinessService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Order } from '../../types';
import { getOrderNextAction } from '../../features/orders/model/getOrderNextAction';
export function OrderStatusCell({ order }: { order: Order }) {
  return (
    <td className="py-4 px-5 whitespace-nowrap">
      <StatusBadge status={operationalStage(order)} size="sm" />
      <span className="block text-[10px] text-slate-500 mt-1">
        {MODE_LABELS[order.fulfillment?.mode ?? 'HOME_HOME']}
        {order.businessVersion === 3 && (
          <span className="block text-xs text-slate-500 mt-1">
            Precio: {order.pricing.pricingStatus} · Pago:{' '}
            {order.pricing.paymentStatus}
            <br />
            Entrada: {order.fulfillment?.inbound.status} · Salida:{' '}
            {order.fulfillment?.outbound.status}
          </span>
        )}
        {order.businessVersion === 3 && (
          <span className="block text-blue-800 mt-1 whitespace-normal max-w-48">
            {getOrderNextAction(order)}
          </span>
        )}
      </span>
    </td>
  );
}
