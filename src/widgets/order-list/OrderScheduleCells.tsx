import { Order } from '../../types';
import {
  deliveryNote,
  LEG_NOTE_CLASS,
  pickupNote,
} from '../../features/orders/model/orderDisplay';

/**
 * Recogida y entrega en una sola columna (dos renglones): la fecha y el chofer, o lo que falta
 * según la etapa real.
 */
export function OrderScheduleCells({ order }: { order: Order }) {
  const pickup = pickupNote(order);
  const delivery = deliveryNote(order);
  return (
    <td className="py-4 px-4 whitespace-nowrap">
      <dl className="space-y-1.5 text-xs">
        <div>
          <dt className="sr-only">Recogida</dt>
          <dd>
            <span className="font-medium text-slate-800">
              <span className="text-slate-500">Recoge </span>
              {order.pickup.date}
            </span>
            <span className={`block ${LEG_NOTE_CLASS[pickup.tone]}`}>{pickup.text}</span>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Entrega</dt>
          <dd>
            <span className="font-medium text-slate-800">
              <span className="text-slate-500">Entrega </span>
              {order.delivery.targetDate}
            </span>
            <span className={`block ${LEG_NOTE_CLASS[delivery.tone]}`}>{delivery.text}</span>
          </dd>
        </div>
      </dl>
    </td>
  );
}
