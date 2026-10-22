import { Order, OrderPriority } from '../../../types';
export function sortOrderList(filteredOrders: Order[]) {
  const priorityWeight: Record<OrderPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };
  return [...filteredOrders].sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return b.id.localeCompare(a.id);
  });
}
