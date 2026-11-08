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
    // Lo más reciente primero (por número de orden o createdAt)
    const aNum = Number(b.trackingNumber?.replace(/\D/g, '')) || 0;
    const bNum = Number(a.trackingNumber?.replace(/\D/g, '')) || 0;
    if (aNum !== bNum) return aNum - bNum;
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}
