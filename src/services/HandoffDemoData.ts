import type { Driver, Facility, Order } from '../types';
import { migrateOrder, type HandoffType } from './fulfillment';
import type { HandoffService, HandoffState } from './HandoffService';

/** MVP fixtures: add missing reception scenarios without resetting local progress. */
export function prepareHandoffDemoData(
  state: HandoffState & { orders: Order[]; drivers: Driver[] },
  facilities: Facility[],
  service: HandoffService,
) {
  for (const facility of facilities.filter((f) => f.status === 'ACTIVE')) {
    const template = state.orders.find((o) => o.facilityId === facility.id);
    if (!template) continue;
    for (const scenario of ['INGRESO', 'RETIRO', 'CHOFER'] as const) {
      if (scenario === 'INGRESO' && !facility.acceptsCustomerDropoff) continue;
      if (scenario === 'RETIRO' && !facility.allowsCustomerPickup) continue;
      const id = `SOL-DEMO-${facility.id}-${scenario}`;
      if (state.orders.some((o) => o.id === id)) continue;
      const driver =
        scenario === 'CHOFER'
          ? state.drivers
              .filter(
                (d) =>
                  d.facilityId === facility.id &&
                  ['AVAILABLE', 'ON_SERVICE'].includes(d.status) &&
                  d.activeOrders < d.maxOrders,
              )
              .sort(
                (a, b) =>
                  a.activeOrders - b.activeOrders || a.id.localeCompare(b.id),
              )[0]
          : undefined;
      if (scenario === 'CHOFER' && !driver) continue;
      const now = new Date().toISOString();
      const date = now.slice(0, 10);
      const order: Order = JSON.parse(JSON.stringify(template));
      Object.assign(order, {
        id,
        trackingNumber: id,
        status:
          scenario === 'RETIRO'
            ? 'READY'
            : scenario === 'CHOFER'
              ? 'ARRIVED_AT_FACILITY'
              : 'AWAITING_INTAKE',
        workflowVersion: undefined,
        fulfillment: undefined,
        intakeHold: undefined,
        previousStatus: undefined,
        quarantineReason: undefined,
        quarantineNotes: undefined,
        quarantineDate: undefined,
        incidentsCount: 0,
        createdAt: now,
        updatedAt: now,
        priority: 'NORMAL',
        slaStatus: 'ON_TIME',
        slaProgressPercent: 0,
        slaDeadline: new Date(Date.now() + 86400000).toISOString(),
        timeline: [],
      });
      order.pickup = { date, timeSlot: '08:00 - 18:00' };
      order.delivery = {
        targetDate: date,
        timeSlot: 'Retiro al estar listo',
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
      };
      order.pricing.paymentStatus = 'PAID';
      if (scenario !== 'CHOFER') {
        order.customerAddress = {
          ...order.customerAddress,
          street: facility.address,
          number: '',
          coordinates: { ...facility.coordinates },
        };
        order.deliveryAddress = JSON.parse(
          JSON.stringify(order.customerAddress),
        );
        order.pricing.deliveryFee = 0;
        order.pricing.total = Number(
          (
            order.pricing.subtotal +
            order.pricing.extrasTotal -
            order.pricing.discount
          ).toFixed(2),
        );
      } else {
        order.pickup.driverId = driver!.id;
        order.pickup.driverName = driver!.name;
        order.pickup.vehiclePlate = driver!.vehiclePlate;
        order.pickup.completedAt = now;
        order.delivery.timeSlot = '16:00 - 18:00';
        driver!.activeOrders++;
      }
      migrateOrder(order, scenario === 'CHOFER' ? 'HOME_HOME' : 'STORE_STORE');
      if (driver) {
        order.fulfillment!.inbound.driverAssignmentId = `${id}-pickup`;
        order.fulfillment!.inbound.status = 'AWAITING_HANDOFF';
      }
      state.orders.push(order);
      service.initialize(state, order);

      // Explicit simulated custody receipts keep later-stage fixtures consistent.
      const priorType: HandoffType | undefined =
        scenario === 'RETIRO'
          ? 'CUSTOMER_TO_FACILITY'
          : scenario === 'CHOFER'
            ? 'CUSTOMER_TO_DRIVER'
            : undefined;
      if (priorType) {
        const prior = state.handoffs.find(
          (h) => h.orderId === id && h.type === priorType,
        )!;
        const count = order.items.reduce((n, item) => n + item.quantity, 0);
        prior.status = 'USED';
        prior.usedAt = now;
        prior.usedByUserId = driver?.id ?? `DEMO-ADMIN-${facility.id}`;
        prior.receipt = {
          count,
          declaredCount: count,
          localValidation: true,
          notes: 'Recepción simulada para el escenario de demostración.',
        };
        state.handoffAudits.push({
          id: `AUD-DEMO-${id}`,
          handoffId: prior.id,
          orderId: id,
          action: 'DEMO_CUSTODY_PREPARED',
          actorId: 'DEMO-SEED',
          actorRole: 'SYSTEM',
          at: now,
          reason:
            'Registro simulado del MVP; no representa una validación real.',
          localValidation: true,
        });
      }
      order.timeline.push({
        id: `TL-DEMO-${id}`,
        status: order.status,
        label: `Escenario de demostración: ${scenario === 'INGRESO' ? 'ingreso en sede' : scenario === 'RETIRO' ? 'listo para retiro' : 'chofer esperando recepción en planta'}`,
        timestamp: now,
        userName: 'Demo local',
        userRole: 'SYSTEM',
      });
    }
  }
}
