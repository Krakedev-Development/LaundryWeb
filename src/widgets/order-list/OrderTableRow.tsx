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
      <td className="whitespace-nowrap px-5 py-4">
        <PriorityBadge priority={order.priority} />
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <SLABadge risk={order.slaStatus} deadline={order.slaDeadline} />
      </td>
      <OrderActionCell order={order} />
    </StaggerTableRow>
  );
}
