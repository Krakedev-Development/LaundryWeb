import { useNavigate } from 'react-router-dom';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { Order } from '../../types';
import { StaggerTableRow } from '../../components/ui/StaggerList';
import { OrderIdentityCells } from './OrderIdentityCells';
import { OrderScheduleCells } from './OrderScheduleCells';
import { OrderStatusCell } from './OrderStatusCell';
import { OrderActionCell } from './OrderActionCell';

export function OrderTableRow({ order }: { order: Order }) {
  const navigate = useNavigate();
  return (
    <StaggerTableRow
      className="group cursor-pointer transition-colors hover:bg-primary-soft/45"
      onClick={() => navigate(`/operations/orders/${order.id}`)}
    >
      <OrderIdentityCells order={order} />
      <OrderScheduleCells order={order} />
      <OrderStatusCell order={order} />
      {/* Prioridad y SLA en una sola columna. */}
      <td className="whitespace-nowrap px-4 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <PriorityBadge priority={order.priority} />
          <SLABadge risk={order.slaStatus} deadline={order.slaDeadline} />
        </div>
      </td>
      <OrderActionCell order={order} />
    </StaggerTableRow>
  );
}
