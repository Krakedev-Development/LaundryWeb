import { operationalStage } from '../../services/fulfillment';
import { useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import { Truck, Eye } from 'lucide-react';
export function OrderActionCell({
  order,
  setAssigningOrder,
}: {
  order: Order;
  setAssigningOrder(order: Order | null): void;
}) {
  const navigate = useNavigate();
  return (
    <td
      className="py-4 px-5 text-right whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-end gap-2">
        {operationalStage(order) === 'PICKUP_PENDING' && (
          <button
            onClick={() => setAssigningOrder(order)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
            title="Asignar chofer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Asignar</span>
          </button>
        )}
        <button
          onClick={() => navigate(`/operations/orders/${order.id}`)}
          className="p-2 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
          title="Ver detalle 360°"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </td>
  );
}
