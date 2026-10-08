import type { WorkflowOrder, FulfillmentLeg } from './fulfillment';

/** Historical receipts stay intact; pending customer drop-off requires a new home booking. */
export function normalizeHomePickup(order: WorkflowOrder): void {
  const plan = order.fulfillment;
  if (!plan || plan.inbound.method !== 'CUSTOMER') return;
  order.legacyInbound = JSON.parse(
    JSON.stringify(plan.inbound),
  ) as FulfillmentLeg;
  plan.inbound.method = 'DRIVER';
  plan.mode = plan.outbound.method === 'DRIVER' ? 'HOME_HOME' : 'HOME_STORE';
  if (
    plan.inbound.status === 'COMPLETED' ||
    ['COMPLETED', 'CANCELLED'].includes(order.status)
  )
    return;
  Object.assign(plan.inbound, {
    address: undefined,
    date: '',
    timeSlot: '',
    timeSlotId: undefined,
    driverId: undefined,
    driverAssignmentId: undefined,
    startedAt: undefined,
    status: 'PENDING',
    milestone: 'PENDING',
    handoffIds: [],
  });
  if (order.pickup)
    Object.assign(order.pickup, {
      date: '',
      timeSlot: '',
      driverId: undefined,
      driverAssignmentId: undefined,
    });
  order.pickupNeedsScheduling = true;
  if (!['INCIDENT', 'PAYMENT_PENDING'].includes(order.status))
    order.status = 'AWAITING_INTAKE';
}
