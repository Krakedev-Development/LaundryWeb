import { operationalStage } from '../../services/fulfillment';
import { Link } from 'react-router-dom';
import { Order } from '../../types';
import { Truck } from 'lucide-react';
import { dispatchHref } from '../../services/operationsLinks';

export function OrderActionCell({ order }: { order: Order }) {
  if (operationalStage(order) !== 'PICKUP_PENDING') {
    return <td className="py-4 px-5 text-right whitespace-nowrap" />;
  }

  return (
    <td className="py-4 px-5 text-right whitespace-nowrap">
      <Link
        to={dispatchHref(order.id)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary hover:text-primary-hover hover:bg-primary-soft rounded-lg transition-colors duration-150 border border-primary/25"
        title="Asignar chofer en Despacho"
      >
        <Truck className="w-3.5 h-3.5" aria-hidden />
        <span>Asignar en Despacho</span>
      </Link>
    </td>
  );
}
