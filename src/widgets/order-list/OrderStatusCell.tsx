import { MODE_LABELS } from '../../services/BusinessService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Order } from '../../types';
import { getOrderNextAction } from '../../features/orders/model/getOrderNextAction';
import { orderDisplayStage } from '../../features/orders/model/orderDisplay';

/**
 * Estado de la solicitud en la lista: la etapa, la modalidad y la siguiente acción. Los
 * detalles técnicos (estado del precio y de cada tramo) quedan en el detalle; aquí solo se
 * avisa un pago pendiente, que sí cambia lo que hay que hacer.
 */
export function OrderStatusCell({ order }: { order: Order }) {
  const paymentPending =
    order.pricing.amountKnown !== false && order.pricing.paymentStatus !== 'PAID';
  return (
    <td className="py-4 px-4 min-w-[180px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={orderDisplayStage(order)} size="sm" />
        {paymentPending && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
            Pago pendiente
          </span>
        )}
      </div>
      <span className="block text-xs text-slate-500 mt-1 max-w-56">
        {MODE_LABELS[order.fulfillment?.mode ?? 'HOME_HOME']}
      </span>
      {order.businessVersion === 3 && (
        <span className="block text-xs font-medium text-primary mt-0.5 whitespace-normal max-w-56">
          {getOrderNextAction(order)}
        </span>
      )}
    </td>
  );
}
