import { Order } from '../../types';
import {
  deliveryNote,
  LEG_NOTE_CLASS,
  pickupNote,
} from '../../features/orders/model/orderDisplay';

/** Fecha de recogida y de entrega, con el chofer o lo que falta según la etapa real. */
export function OrderScheduleCells({ order }: { order: Order }) {
  const pickup = pickupNote(order);
  const delivery = deliveryNote(order);
  return (
    <>
      <td className="py-4 px-5 whitespace-nowrap">
        <div className="font-medium text-slate-800">{order.pickup.date}</div>
        <div className={`text-xs mt-0.5 ${LEG_NOTE_CLASS[pickup.tone]}`}>{pickup.text}</div>
      </td>
      <td className="py-4 px-5 whitespace-nowrap">
        <div className="font-medium text-slate-800">{order.delivery.targetDate}</div>
        <div className={`text-xs mt-0.5 ${LEG_NOTE_CLASS[delivery.tone]}`}>{delivery.text}</div>
      </td>
    </>
  );
}
