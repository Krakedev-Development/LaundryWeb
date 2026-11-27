require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mapBackendOrderToOrder } = require('../src/services/api/ordersApi.ts');
const {
  orderDisplayStage,
  pickupNote,
  deliveryNote,
  canAssignPickup,
  canAssignDelivery,
  getMilestoneIndex,
  isOrderClosed,
  formatActor,
} = require('../src/features/orders/model/orderDisplay.ts');
const { plantPhase, BEFORE_PLANT, AFTER_PLANT } = require('../src/features/plant/plantPhase.ts');

// Paso 2 (UI): cómo se MUESTRA cada etapa. No cambia el estado real ni el flujo.
const raw = (status, mode = 'HOME_HOME', extra = {}) => ({
  id: 'o-1',
  number: 2,
  status,
  mode,
  facilityId: 'f1',
  paymentStatus: 'PAID',
  pricingStatus: 'FINAL',
  total: '21.85',
  version: 17,
  createdAt: new Date().toISOString(),
  items: [],
  legs: [],
  events: [],
  ...extra,
});
const order = (status, mode, extra) => mapBackendOrderToOrder(raw(status, mode, extra));

test('lista para retiro en sede se muestra como "Listo para retiro", no como entrega que espera chofer', () => {
  assert.equal(orderDisplayStage(order('READY_FOR_PICKUP', 'HOME_STORE')), 'READY');
  assert.equal(orderDisplayStage(order('READY_FOR_DELIVERY', 'HOME_HOME')), 'DELIVERY_SCHEDULED');
  assert.equal(orderDisplayStage(order('IN_PROCESS', 'HOME_HOME')), 'IN_PROCESS');
});

test('"Sin chofer" solo aparece cuando la sede todavía debe asignarlo', () => {
  assert.deepEqual(pickupNote(order('CONFIRMED')), { text: 'Sin chofer', tone: 'action' });
  // Ya entregada: la recogida terminó hace rato, no hay aviso.
  assert.deepEqual(pickupNote(order('DELIVERED')), { text: 'Recogida completada', tone: 'muted' });
  assert.deepEqual(pickupNote(order('IN_PROCESS')), { text: 'Recogida completada', tone: 'muted' });

  assert.deepEqual(deliveryNote(order('CONFIRMED')), { text: 'Por programar', tone: 'muted' });
  assert.deepEqual(deliveryNote(order('IN_PROCESS')), { text: 'En planta', tone: 'muted' });
  assert.deepEqual(deliveryNote(order('READY_FOR_DELIVERY')), { text: 'Sin chofer', tone: 'action' });
  assert.deepEqual(deliveryNote(order('READY_FOR_PICKUP', 'HOME_STORE')), { text: 'Retiro en sede', tone: 'muted' });
  assert.deepEqual(deliveryNote(order('DELIVERED')), { text: 'Entregada', tone: 'muted' });
});

test('canAssignPickup y canAssignDelivery respetan estado, método y pago', () => {
  // Con pago pendiente, no se puede asignar chofer de recogida
  const unpaid = order('CONFIRMED', 'HOME_HOME', { paymentStatus: 'PENDING' });
  assert.equal(canAssignPickup(unpaid), false);

  // Con pago completado y etapa CONFIRMED o PICKUP_PENDING, sí se puede
  const paidConfirmed = order('CONFIRMED', 'HOME_HOME', { paymentStatus: 'PAID' });
  assert.equal(canAssignPickup(paidConfirmed), true);

  // Si requiere reprogramación de agenda, no se puede asignar
  const needsSchedule = { ...paidConfirmed, pickupNeedsScheduling: true };
  assert.equal(canAssignPickup(needsSchedule), false);

  // Si ya tiene chofer asignado, no permite reasignar
  const alreadyAssigned = {
    ...paidConfirmed,
    pickup: { ...paidConfirmed.pickup, driverId: 'd1', driverName: 'Carlos Chofer' },
  };
  assert.equal(canAssignPickup(alreadyAssigned), false);

  // Si la recogida ya fue completada, no permite asignar
  const completedPickup = order('PICKED_UP', 'HOME_HOME', { paymentStatus: 'PAID' });
  assert.equal(canAssignPickup(completedPickup), false);

  // Entrega: solo cuando está listo para entrega a domicilio
  assert.equal(canAssignDelivery(paidConfirmed), false);
  const readyHome = order('READY_FOR_DELIVERY', 'HOME_HOME');
  assert.equal(canAssignDelivery(readyHome), true);
  const readyStore = order('READY_FOR_PICKUP', 'HOME_STORE');
  assert.equal(canAssignDelivery(readyStore), false);
});

test('getMilestoneIndex mapea etapas correctamente para el stepper global', () => {
  assert.equal(getMilestoneIndex('CREATED'), 0);
  assert.equal(getMilestoneIndex('PAYMENT_PENDING'), 0);
  assert.equal(getMilestoneIndex('CONFIRMED'), 0);
  assert.equal(getMilestoneIndex('PICKUP_PENDING'), 0);
  assert.equal(getMilestoneIndex('PICKED_UP'), 1);
  assert.equal(getMilestoneIndex('HEADING_TO_FACILITY'), 1);
  assert.equal(getMilestoneIndex('AT_FACILITY'), 2);
  assert.equal(getMilestoneIndex('IN_PROCESS'), 2);
  assert.equal(getMilestoneIndex('QUALITY_CONTROL'), 2);
  assert.equal(getMilestoneIndex('READY_FOR_DELIVERY'), 3);
  assert.equal(getMilestoneIndex('OUT_FOR_DELIVERY'), 3);
  assert.equal(getMilestoneIndex('DELIVERED'), 4);
  assert.equal(getMilestoneIndex('CLOSED'), 4);
});

test('isOrderClosed detecta órdenes finalizadas por estado o etapa operativa', () => {
  assert.equal(isOrderClosed(order('CONFIRMED')), false);
  assert.equal(isOrderClosed(order('IN_PROCESS')), false);
  assert.equal(isOrderClosed(order('READY_FOR_DELIVERY')), false);
  assert.equal(isOrderClosed(order('CLOSED')), true);
  assert.equal(isOrderClosed(order('COMPLETED')), true);
});

test('formatActor traduce roles y no duplica nombre cuando coincide con el rol', () => {
  assert.deepEqual(formatActor('CLIENT', 'CLIENT'), { name: 'Cliente' });
  assert.deepEqual(formatActor('', 'CLIENT'), { name: 'Cliente' });
  assert.deepEqual(formatActor('Carlos Chofer', 'DRIVER'), { name: 'Carlos Chofer', roleLabel: 'Chofer' });
  assert.deepEqual(formatActor('Supervisor Central', 'SUPERVISOR'), {
    name: 'Supervisor Central',
    roleLabel: 'Supervisor',
  });
});

test('la fase de planta no se marca antes de llegar ni vuelve a "Recepción" al retener', () => {
  assert.equal(plantPhase(order('CONFIRMED')), BEFORE_PLANT);
  assert.equal(plantPhase(order('HEADING_TO_FACILITY')), BEFORE_PLANT);
  assert.equal(plantPhase(order('AT_FACILITY')), 0);
  assert.equal(plantPhase(order('IN_PROCESS')), 4);
  assert.equal(plantPhase(order('READY_FOR_DELIVERY')), 6);
  assert.equal(plantPhase(order('DELIVERED')), AFTER_PLANT);
  // Retenida en lavado: conserva la fase de lavado (dato de la incidencia abierta del servidor).
  const held = order('INCIDENT', 'HOME_HOME', { incidents: [{ status: 'OPEN', previousStatus: 'IN_PROCESS' }] });
  assert.equal(plantPhase(held), 4);
  // Retenida antes de llegar a planta (p. ej. recogida fallida): sin fase.
  const failedPickup = order('INCIDENT', 'HOME_HOME', { incidents: [{ status: 'OPEN', previousStatus: 'CONFIRMED' }] });
  assert.equal(plantPhase(failedPickup), BEFORE_PLANT);
});
