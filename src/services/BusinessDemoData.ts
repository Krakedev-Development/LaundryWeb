import type { CatalogItem, Facility, Order } from '../types';
import { migrateOrder } from './fulfillment';
import {
  ensureBusinessState,
  type BusinessState,
  type SlotContext,
} from './BusinessService';
import type { HandoffService } from './HandoffService';

export function prepareBusinessDemoData(
  raw: BusinessState,
  facilities: Facility[],
  handoffs: HandoffService,
  catalog: CatalogItem[],
  now = new Date(),
) {
  const s = ensureBusinessState(raw);
  // Earlier demo snapshots copied unrelated extras and a coupon from a legacy order.
  // Repair only the unpriced weight fixture; never alter a recorded measurement or payment.
  const pendingWeight = s.orders.find(
    (o) =>
      o.id === 'SOL-WEIGHT-001' &&
      o.businessVersion === 3 &&
      o.pricing.amountKnown === false,
  );
  if (pendingWeight && !s.weights.some((w) => w.orderId === pendingWeight.id)) {
    Object.assign(pendingWeight.pricing, {
      subtotal: 0,
      discount: 0,
      extrasTotal: 0,
      deliveryFee: 0,
      promoCodeApplied: undefined,
      promotionSnapshot: undefined,
    });
    pendingWeight.extras = [];
  }
  facilities.forEach(
    (f) =>
      (f.operatingSchedule ??= {
        days: [1, 2, 3, 4, 5, 6],
        open: '08:00',
        close: '18:00',
      }),
  );
  if (!catalog.some((c) => c.id === 'SVC-WEIGHT'))
    catalog.push({
      id: 'SVC-WEIGHT',
      name: 'Lavado y doblado por peso',
      category: 'SERVICIOS',
      type: 'LAVADO_PESO',
      description:
        'Tarifa de demostración. El peso real se registra en planta.',
      price: 0,
      pricingModel: 'PER_WEIGHT',
      pricePerWeightUnit: 1.6,
      weightUnit: 'LB',
      restrictions: ['No incluye prendas delicadas ni limpieza en seco'],
      customerSelectable: true,
      estimatedHours: 24,
      minHours: 24,
      maxHours: 48,
      status: 'ACTIVE',
    });
  catalog.forEach((c) => {
    c.pricingModel ??= 'FIXED';
    c.customerSelectable ??= true;
  });
  for (const f of facilities.filter((f) => f.status === 'ACTIVE'))
    for (let day = 1; day <= 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (
        f.operatingSchedule &&
        !f.operatingSchedule.days.includes(date.getDay())
      )
        continue;
      for (const context of [
        'DRIVER_PICKUP',
        'DRIVER_DELIVERY',
        'FACILITY_DROPOFF',
        'FACILITY_PICKUP',
      ] as SlotContext[])
        for (const start of ['09:00', '14:00']) {
          const id = `SLOT-${f.id}-${context}-${ymd}-${start}`;
          if (!s.timeSlots.some((x) => x.id === id))
            s.timeSlots.push({
              id,
              facilityId: f.id,
              context,
              date: ymd,
              start,
              end: start === '09:00' ? '11:00' : '16:00',
              capacity: 8,
              reservedCount: 0,
              active: true,
            });
        }
    }
  const template =
    s.orders.find((o) => o.facilityId === 'FAC-02') ?? s.orders[0];
  if (!template) return;
  for (const [id, mode, weight] of [
    ['SOL-HH-001', 'HOME_HOME', false],
    ['SOL-HS-001', 'HOME_STORE', false],
    ['SOL-SH-001', 'STORE_HOME', false],
    ['SOL-SS-001', 'STORE_STORE', false],
    ['SOL-WEIGHT-001', 'STORE_STORE', true],
  ] as const) {
    if (s.orders.some((o) => o.id === id)) continue;
    const o: Order = JSON.parse(JSON.stringify(template));
    const customer =
      s.customers.find((c) => c.id === 'CUST-001') ?? s.customers[0];
    const f = facilities.find((f) => f.id === o.facilityId)!;
    Object.assign(o, {
      id,
      trackingNumber: id,
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      status: 'PICKUP_PENDING',
      workflowVersion: undefined,
      businessVersion: 3,
      fulfillment: undefined,
      intakeHold: undefined,
      inspectionCompleted: false,
      previousStatus: undefined,
      quarantineReason: undefined,
      quarantineNotes: undefined,
      quarantineDate: undefined,
      incidentsCount: 0,
      timeline: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    o.pickup = { date: '', timeSlot: '' };
    o.delivery = {
      targetDate: '',
      timeSlot: '',
      recipientName: customer.fullName,
      recipientPhone: customer.phone,
    };
    if (mode.startsWith('STORE'))
      o.customerAddress = {
        ...o.customerAddress,
        street: f.address,
        number: '',
        coordinates: f.coordinates,
      };
    if (mode.endsWith('STORE'))
      o.deliveryAddress = {
        ...o.deliveryAddress,
        street: f.address,
        number: '',
        coordinates: f.coordinates,
      };
    o.pricing = {
      ...o.pricing,
      discount: weight ? 0 : o.pricing.discount,
      extrasTotal: weight ? 0 : o.pricing.extrasTotal,
      deliveryFee: weight ? 0 : o.pricing.deliveryFee,
      promoCodeApplied: weight ? undefined : o.pricing.promoCodeApplied,
      pricingModel: weight ? 'PER_WEIGHT' : 'FIXED',
      pricingStatus: weight ? 'PENDING_WEIGHT' : 'FINAL',
      amountKnown: !weight,
      paymentStatus: weight ? 'PENDING_AMOUNT' : 'PAID',
      amountPaid: weight ? 0 : o.pricing.total,
      amountDue: weight ? undefined : 0,
      pricePerWeightUnit: weight ? 1.6 : undefined,
      weightUnit: 'LB',
      measuredWeight: undefined,
      subtotal: weight ? 0 : o.pricing.subtotal,
      total: weight ? 0 : o.pricing.total,
    };
    o.serviceType = weight ? 'Lavado y doblado por peso' : o.serviceType;
    if (weight) {
      o.extras = [];
      o.catalogServiceId = 'SVC-WEIGHT';
      o.processingHours = 24;
    }
    migrateOrder(o, mode);
    for (const legName of ['inbound', 'outbound'] as const) {
      const leg = o.fulfillment![legName];
      const context =
        legName === 'inbound'
          ? leg.method === 'CUSTOMER'
            ? 'FACILITY_DROPOFF'
            : 'DRIVER_PICKUP'
          : leg.method === 'CUSTOMER'
            ? 'FACILITY_PICKUP'
            : 'DRIVER_DELIVERY';
      const choices = s.timeSlots.filter(
        (x) => x.facilityId === f.id && x.context === context,
      );
      const slot = choices[legName === 'inbound' ? 0 : 4];
      if (slot) {
        leg.date = slot.date;
        leg.timeSlot = `${slot.start}–${slot.end}`;
        leg.timeSlotId = slot.id;
        slot.reservedCount++;
        s.reservations.push({
          id: `RSV-${id}-${legName}`,
          orderId: id,
          leg: legName,
          slotId: slot.id,
          active: true,
        });
      }
    }
    o.pickup.date = o.fulfillment!.inbound.date;
    o.pickup.timeSlot = o.fulfillment!.inbound.timeSlot;
    o.delivery.targetDate = o.fulfillment!.outbound.date;
    o.delivery.timeSlot = o.fulfillment!.outbound.timeSlot;
    s.orders.unshift(o);
    handoffs.initialize(s, o, false, false);
  }
}
