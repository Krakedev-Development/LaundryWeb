import { Order } from '../../../types';
export function matchesOrderSearch(order: Order, searchQuery: string) {
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const matchesId = order.id.toLowerCase().includes(q);
    const matchesTracking = order.trackingNumber.toLowerCase().includes(q);
    const matchesCustomer = order.customerName.toLowerCase().includes(q);
    const matchesAddress =
      order.customerAddress.street.toLowerCase().includes(q) ||
      order.customerAddress.neighborhood.toLowerCase().includes(q);
    if (!matchesId && !matchesTracking && !matchesCustomer && !matchesAddress) {
      return false;
    }
  }
  return true;
}
