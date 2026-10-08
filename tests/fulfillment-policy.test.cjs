require('./ts-loader.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
const { storageService: storage } = require('../src/services/storage.ts');
const { ensureBusinessState } = require('../src/services/BusinessService.ts');

test('persisted pending customer drop-off releases its booking, revokes its QR and requires a new home pickup', () => {
  const state = structuredClone(storage.getWorkflow());
  const order = state.orders.find((o) => o.id === 'SOL-SS-001');
  const previous = structuredClone(order.fulfillment.inbound);
  const reservation = state.reservations.find(
    (r) => r.orderId === order.id && r.leg === 'inbound' && r.active,
  );
  const oldSlot = structuredClone(
    state.timeSlots.find((s) => s.id === reservation.slotId),
  );
  state.timeSlots.find((s) => s.id === reservation.slotId).reservedCount--;
  Object.assign(oldSlot, {
    id: 'LEGACY-DROPOFF-SLOT',
    context: 'FACILITY_DROPOFF',
    reservedCount: 1,
  });
  state.timeSlots.push(oldSlot);
  reservation.slotId = oldSlot.id;
  const oldExit = state.timeSlots.find(
    (s) => s.id === order.fulfillment.outbound.timeSlotId,
  );
  oldExit.date = '2000-01-01';
  Object.assign(order.fulfillment.inbound, {
    method: 'CUSTOMER',
    timeSlotId: oldSlot.id,
  });
  order.fulfillment.mode = 'STORE_STORE';
  const code = state.handoffs.find(
    (h) => h.orderId === order.id && h.type === 'CUSTOMER_TO_DRIVER',
  );
  Object.assign(code, { type: 'CUSTOMER_TO_FACILITY', status: 'ACTIVE' });
  const balance = state.customers.find(
    (c) => c.id === order.customerId,
  ).walletBalance;
  const timeline = structuredClone(order.timeline);
  values.set('lw_workflow_v2', JSON.stringify(state));
  const migratedStorage = new storage.constructor();
  const next = migratedStorage.getWorkflow(),
    migrated = next.orders.find((o) => o.id === order.id);
  assert.equal(migrated.fulfillment.mode, 'HOME_STORE');
  assert.equal(migrated.fulfillment.inbound.method, 'DRIVER');
  assert.equal(migrated.pickupNeedsScheduling, true);
  assert.equal(migrated.fulfillment.inbound.timeSlotId, undefined);
  assert.equal(migrated.fulfillment.inbound.driverId, undefined);
  assert.equal(
    next.reservations.find((r) => r.id === reservation.id).active,
    false,
  );
  assert.equal(
    next.timeSlots.find((s) => s.id === oldSlot.id).reservedCount,
    0,
  );
  assert.equal(next.timeSlots.find((s) => s.id === oldSlot.id).active, false);
  assert.equal(next.handoffs.find((h) => h.id === code.id).status, 'REVOKED');
  assert.equal(
    next.customers.find((c) => c.id === order.customerId).walletBalance,
    balance,
  );
  assert.deepEqual(migrated.timeline, timeline);
  assert.equal(
    migratedStorage.assignDriver(order.id, 'DRV-105', 'pickup').success,
    false,
  );
  assert.throws(() =>
    migratedStorage.handoffService.verifyAdministrativeOverride(
      code.id,
      'DEMO-ADMIN-FAC-02',
      'Intento de ingresar en sede',
    ),
  );
  assert.throws(() =>
    migratedStorage.handoffService.regenerate(
      code.id,
      'DEMO-ADMIN-FAC-02',
      'Intento de regenerar ingreso',
    ),
  );
  assert.deepEqual(ensureBusinessState(structuredClone(next)), next);
  assert.equal(migrated.legacyInbound.method, 'CUSTOMER');
  const slot = migratedStorage.businessService
    .availableSlots(order.facilityId, 'DRIVER_PICKUP')
    .find((s) => s.date === previous.date);
  assert.ok(slot);
  const client = migratedStorage.demoBusinessActor({
    id: order.customerId,
    role: 'CLIENT',
    name: order.customerName,
  });
  const exit = migratedStorage.businessService
    .availableSlots(order.facilityId, 'FACILITY_PICKUP')
    .find((s) => s.date > previous.date);
  assert.ok(exit);
  client.change(
    order.id,
    'outbound',
    exit.id,
    'CUSTOMER',
    migrated.deliveryAddress,
    'Actualizar salida anterior vencida',
  );
  assert.equal(
    migratedStorage.getOrderById(order.id).pickupNeedsScheduling,
    true,
  );
  migratedStorage
    .demoBusinessActor({
      id: order.customerId,
      role: 'CLIENT',
      name: order.customerName,
    })
    .change(
      order.id,
      'inbound',
      slot.id,
      'DRIVER',
      migrated.customerAddress,
      'Recogida a domicilio',
    );
  assert.equal(
    migratedStorage.getOrderById(order.id).pickupNeedsScheduling,
    false,
  );
  assert.equal(
    migratedStorage.getOrderById(order.id).fulfillment.inbound.method,
    'DRIVER',
  );
});

test('an already recorded local reception keeps receipts, counts, status and history, without fabricated driver custody', () => {
  const state = structuredClone(storage.getWorkflow());
  const order = state.orders.find((o) => o.id === 'SOL-DEMO-FAC-02-RETIRO');
  Object.assign(order.fulfillment.inbound, {
    method: 'CUSTOMER',
    status: 'COMPLETED',
  });
  order.fulfillment.mode = 'STORE_STORE';
  const receipt = state.handoffs.find(
    (h) => h.orderId === order.id && h.type === 'DRIVER_TO_FACILITY',
  );
  receipt.type = 'CUSTOMER_TO_FACILITY';
  const recorded = structuredClone(receipt),
    timeline = structuredClone(order.timeline);
  const normalized = ensureBusinessState(state),
    next = normalized.orders.find((o) => o.id === order.id);
  storage.handoffService.initialize(normalized, next, false, true);
  assert.equal(next.status, 'READY');
  assert.equal(next.pickupNeedsScheduling, undefined);
  assert.deepEqual(
    normalized.handoffs.find((h) => h.id === receipt.id),
    recorded,
  );
  assert.deepEqual(next.timeline, timeline);
  assert.ok(
    !normalized.handoffs.some(
      (h) => h.orderId === order.id && h.type === 'DRIVER_TO_FACILITY',
    ),
  );
});
