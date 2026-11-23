import { operationalStage } from '../../services/fulfillment';
import { Link, useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import { Truck, Eye } from 'lucide-react';
import { dispatchHref } from '../../services/operationsLinks';
export function OrderActionCell({ order }: { order: Order }) {
  const navigate = useNavigate();
  return (
    <td
      className="py-4 px-4 text-right whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-end gap-2">
        {/* La recogida se asigna solo en Despacho: aquí solo se navega hasta allí. */}
        {operationalStage(order) === 'PICKUP_PENDING' && (
          <Link
            to={dispatchHref(order.id)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            title="Asignar chofer en Despacho"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Asignar en Despacho</span>
          </Link>
        )}
        <button
          onClick={() => navigate(`/operations/orders/${order.id}`)}
          className="p-2 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
          title="Ver detalle"
          aria-label={`Ver detalle de ${order.trackingNumber || order.id}`}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </td>
  );
}
