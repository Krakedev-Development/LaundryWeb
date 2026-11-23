import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { Order } from '../../types';
import { OrderIdentityCells } from './OrderIdentityCells';
import { OrderScheduleCells } from './OrderScheduleCells';
import { OrderStatusCell } from './OrderStatusCell';
import { OrderActionCell } from './OrderActionCell';

export function OrderTableRow({ order }: { order: Order }) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors duration-150 group">
      <OrderIdentityCells order={order} />
      <OrderScheduleCells order={order} />
      <OrderStatusCell order={order} />
      <td className="py-4 px-5 whitespace-nowrap">
        <PriorityBadge priority={order.priority} />
      </td>
      <td className="py-4 px-5 whitespace-nowrap">
        <SLABadge risk={order.slaStatus} deadline={order.slaDeadline} />
      </td>
      <OrderActionCell order={order} />
    </tr>
  );
}
